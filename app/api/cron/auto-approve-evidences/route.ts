// app/api/cron/auto-approve-evidences/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const HOURS_96_MS = 96 * 60 * 60 * 1000;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const h = (req.headers.get('x-cron-secret') || '').trim();
    if (h !== secret) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const now = Date.now();
  const cutoffPending = new Date(now - HOURS_96_MS);
  const cutoffFixes = new Date(now - HOURS_96_MS);

  try {
    // 1) auto-approve old PENDING
    const pendings = await prisma.taskEvidence.findMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: cutoffPending },
      },
      include: { task: true },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });

    let processedApproved = 0;
    for (const e of pendings) {
      const reward = e.task.reward ?? 0;

      try {
        await prisma.$transaction(async (tx) => {
          const fresh = await tx.taskEvidence.findUnique({
            where: { id: e.id },
            select: { status: true, authorId: true, taskId: true },
          });
          if (!fresh || fresh.status !== 'PENDING') return;

          await tx.taskEvidence.update({
            where: { id: e.id },
            data: {
              status: 'APPROVED',
              decidedAt: new Date(),
              decidedById: null,
              autoApproved: true,

              // 🆕 system event -> client should see notification too (optional, safe)
              clientSystemSeen: false,

              // worker should see that client didn't respond -> still a result
              workerDecisionSeen: false,
            },
          });

          if (reward > 0) {
            const existing = await tx.walletTransaction.findFirst({
              where: { userId: e.authorId, evidenceId: e.id, type: 'EARNING' },
              select: { id: true },
            });
            if (!existing) {
              await tx.walletTransaction.create({
                data: {
                  userId: e.authorId,
                  counterpartyId: e.task.authorId,
                  taskId: e.taskId,
                  evidenceId: e.id,
                  type: 'EARNING',
                  status: 'COMPLETED',
                  amount: reward,
                  method: 'balance',
                  description: `Task reward: ${e.task.title}`.slice(0, 190),
                },
              });
            }
          }
        });

        processedApproved++;
      } catch (err) {
        console.error('auto_approve_one_failed', e.id, err);
      }
    }

    // 2) expire NEEDS_FIXES when worker didn't resubmit in 96h
    const needFixes = await prisma.taskEvidence.findMany({
      where: {
        status: 'NEEDS_FIXES',
        needsFixesAt: { lt: cutoffFixes },
      },
      select: { id: true },
      orderBy: { needsFixesAt: 'asc' },
      take: 200,
    });

    let processedExpired = 0;

    for (const row of needFixes) {
      try {
        await prisma.$transaction(async (tx) => {
          const fresh = await tx.taskEvidence.findUnique({
            where: { id: row.id },
            select: { id: true, status: true },
          });
          if (!fresh || fresh.status !== 'NEEDS_FIXES') return;

          // if worker already resubmitted (child evidence exists), do NOT expire
          const hasFix = await tx.taskEvidence.findFirst({
            where: { fixForId: row.id },
            select: { id: true },
          });
          if (hasFix) return;

          await tx.taskEvidence.update({
            where: { id: row.id },
            data: {
              status: 'EXPIRED',
              decidedAt: new Date(),
              decidedById: null,
              autoApproved: false,

              // 🆕 notify both sides about expiry
              workerDecisionSeen: false,
              clientSystemSeen: false,

              // 🆕 expiry makes rating prompts a notification
              workerSawRatingPrompt: false,
              clientSawRatingPrompt: false,
            },
          });
        });

        processedExpired++;
      } catch (err) {
        console.error('expire_needs_fixes_failed', row.id, err);
      }
    }

    return NextResponse.json(
      {
        ok: true,
        autoApprovedFound: pendings.length,
        autoApprovedProcessed: processedApproved,
        expiredFound: needFixes.length,
        expiredProcessed: processedExpired,
      },
      { status: 200 },
    );
  } catch (e) {
    console.error('cron_auto_approve_error', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
