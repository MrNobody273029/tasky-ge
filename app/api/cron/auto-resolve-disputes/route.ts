// app/api/cron/auto-resolve-disputes/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const h = (req.headers.get("x-cron-secret") || "").trim();
    if (h !== secret) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const now = new Date();

  try {
    // Disputes that are waiting, deadline passed, and ONLY ONE side submitted
    const disputes = await prisma.dispute.findMany({
      where: {
        status: "WAITING_OTHER",
        deadlineAt: { lt: now },
        OR: [
          { clientSubmitted: true, workerSubmitted: false },
          { clientSubmitted: false, workerSubmitted: true },
        ],
      },
      include: {
        task: true,
        evidence: { select: { id: true, status: true, authorId: true, taskId: true } },
      },
      take: 200,
      orderBy: { deadlineAt: "asc" },
    });

    let processed = 0;

    for (const d of disputes) {
      try {
        await prisma.$transaction(async (tx) => {
          // re-check fresh in tx
          const fresh = await tx.dispute.findUnique({
            where: { id: d.id },
            select: {
              id: true,
              status: true,
              deadlineAt: true,
              clientSubmitted: true,
              workerSubmitted: true,
              evidenceId: true,
              taskId: true,
              clientId: true,
              workerId: true,
            },
          });
          if (!fresh) return;
          if (fresh.status !== "WAITING_OTHER") return;
          if (fresh.deadlineAt.getTime() >= Date.now()) return;

          const clientWins = fresh.clientSubmitted === true && fresh.workerSubmitted === false;
          const workerWins = fresh.workerSubmitted === true && fresh.clientSubmitted === false;

          if (!clientWins && !workerWins) return;

          // 1) resolve dispute
          const resultText = clientWins
            ? "Auto-resolved: worker did not submit in time."
            : "Auto-resolved: client did not submit in time.";

          await tx.dispute.update({
            where: { id: fresh.id },
            data: {
              status: "RESOLVED",
              resolvedById: null,
              resolvedAt: new Date(),
              resultText,
              clientSeen: false,
              workerSeen: false,
            },
          });

          // 2) apply outcome to evidence
          // If worker wins -> evidence APPROVED (+ payout)
          // If client wins -> evidence REJECTED (no payout)
          if (workerWins) {
            const ev = await tx.taskEvidence.findUnique({
              where: { id: fresh.evidenceId },
              select: { id: true, status: true, authorId: true, taskId: true, task: { select: { authorId: true, title: true, reward: true } } },
            });
            if (!ev) return;

            // set evidence approved
            await tx.taskEvidence.update({
              where: { id: ev.id },
              data: {
                status: "APPROVED",
                decidedAt: new Date(),
                decidedById: null,
                autoApproved: false,
                workerDecisionSeen: false,
                clientSystemSeen: false,
              },
            });

            const reward = ev.task.reward ?? 0;

            // create earning tx if not exists
            if (reward > 0) {
              const existingTx = await tx.walletTransaction.findFirst({
                where: { userId: ev.authorId, evidenceId: ev.id, type: "EARNING" },
                select: { id: true },
              });
              if (!existingTx) {
                await tx.walletTransaction.create({
                  data: {
                    userId: ev.authorId,
                    counterpartyId: ev.task.authorId,
                    taskId: ev.taskId,
                    evidenceId: ev.id,
                    disputeId: fresh.id,
                    type: "EARNING",
                    status: "COMPLETED",
                    amount: reward,
                    method: "balance",
                    description: `Dispute win (auto): ${ev.task.title}`.slice(0, 190),
                  },
                });
              }
            }
          } else if (clientWins) {
            await tx.taskEvidence.update({
              where: { id: fresh.evidenceId },
              data: {
                status: "REJECTED",
                decidedAt: new Date(),
                decidedById: null,
                autoApproved: false,
                workerDecisionSeen: false,
                clientSystemSeen: false,
              },
            });
          }
        });

        processed++;
      } catch (err) {
        console.error("auto_resolve_dispute_one_failed", d.id, err);
      }
    }

    return NextResponse.json({ ok: true, found: disputes.length, processed }, { status: 200 });
  } catch (e) {
    console.error("cron_auto_resolve_disputes_error", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
