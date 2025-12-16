import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureUserFromReq } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await ensureUserFromReq(req);
    if (!me || !(me as any).isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const disputeId = String(params?.id || "").trim();
    if (!disputeId) return NextResponse.json({ error: "missing_id" }, { status: 400 });

    const body = (await req.json().catch(() => ({}))) as any;

    const clientRefund = Math.max(0, Math.round(Number(body?.clientRefund ?? 0)));
    const workerPayout = Math.max(0, Math.round(Number(body?.workerPayout ?? 0)));
    const platformKeep = Math.max(0, Math.round(Number(body?.platformKeep ?? 0)));
    const note = String(body?.note || "").trim().slice(0, 4000);

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        task: { select: { id: true, title: true, reward: true } },
        evidence: { select: { id: true } },
      },
    });
    if (!dispute) return NextResponse.json({ error: "not_found" }, { status: 404 });

    if (dispute.status === "RESOLVED") {
      return NextResponse.json({ ok: true, status: "RESOLVED" }, { status: 200 });
    }
    if (!dispute.task || !dispute.evidence) {
      return NextResponse.json({ error: "missing_context" }, { status: 409 });
    }

    const reward = Number(dispute.task.reward) || 0;
    const sum = clientRefund + workerPayout + platformKeep;
    if (reward > 0 && sum > reward) {
      return NextResponse.json({ error: "split_exceeds_reward", reward, sum }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // idempotent wallet writes
      const existingTx = await tx.walletTransaction.findFirst({
        where: { disputeId: dispute.id },
        select: { id: true },
      });

      if (!existingTx) {
        const descBase = `Dispute resolved: ${dispute.task!.title}`.slice(0, 120);

        if (clientRefund > 0) {
          await tx.walletTransaction.create({
            data: {
              userId: dispute.clientId,
              counterpartyId: dispute.workerId,
              taskId: dispute.taskId,
              evidenceId: dispute.evidenceId,
              disputeId: dispute.id,
              type: "OTHER",
              status: "COMPLETED",
              amount: clientRefund,
              method: "balance",
              description: `${descBase} — client refund`.slice(0, 190),
            },
          });
        }

        if (workerPayout > 0) {
          await tx.walletTransaction.create({
            data: {
              userId: dispute.workerId,
              counterpartyId: dispute.clientId,
              taskId: dispute.taskId,
              evidenceId: dispute.evidenceId,
              disputeId: dispute.id,
              type: "EARNING",
              status: "COMPLETED",
              amount: workerPayout,
              method: "balance",
              description: `${descBase} — worker payout`.slice(0, 190),
            },
          });
        }
      }

      await tx.dispute.update({
        where: { id: dispute.id },
        data: {
          status: "RESOLVED",
          resolvedById: me.id,
          resolvedAt: new Date(),
          resultText: note, // <-- Front expects resultText
          splitJson: JSON.stringify({ clientRefund, workerPayout, platformKeep }),
        },
      });
    });

    return NextResponse.json({ ok: true, status: "RESOLVED" }, { status: 200 });
  } catch (e) {
    console.error("POST /api/admin/disputes/[id]/resolve error", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
