// app/api/evidences/[id]/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureUserFromReq } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await ensureUserFromReq(req);
    if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

    const evidenceId = (params?.id || '').trim();
    if (!evidenceId) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

    const evidence = await prisma.taskEvidence.findUnique({
      where: { id: evidenceId },
      include: { task: true },
    });
    if (!evidence) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    if (evidence.task.authorId !== user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    if (evidence.status === 'APPROVED') {
      return NextResponse.json({ ok: true, status: 'APPROVED' }, { status: 200 });
    }
    if (evidence.status === 'EXPIRED') {
      return NextResponse.json({ error: 'expired' }, { status: 409 });
    }

    const reward = evidence.task.reward ?? 0;

    await prisma.$transaction(async (tx) => {
      await tx.taskEvidence.update({
        where: { id: evidenceId },
        data: {
          status: 'APPROVED',
          decidedById: user.id,
          decidedAt: new Date(),
          autoApproved: false,

          // 🆕 worker should be notified: client responded
          workerDecisionSeen: false,

          // confirm flow: rating modal already forces client review in UI,
          // but DB flags stay compatible
        },
      });

      if (reward > 0) {
        const existing = await tx.walletTransaction.findFirst({
          where: { userId: evidence.authorId, evidenceId, type: 'EARNING' },
        });
        if (!existing) {
          await tx.walletTransaction.create({
            data: {
              userId: evidence.authorId,
              counterpartyId: evidence.task.authorId,
              taskId: evidence.taskId,
              evidenceId,
              type: 'EARNING',
              status: 'COMPLETED',
              amount: reward,
              method: 'balance',
              description: `Task reward: ${evidence.task.title}`.slice(0, 190),
            },
          });
        }
      }
    });

    return NextResponse.json({ ok: true, status: 'APPROVED' }, { status: 200 });
  } catch (e) {
    console.error('evidence_confirm_error', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
