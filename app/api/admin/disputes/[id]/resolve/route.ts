import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureUserFromReq } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function requireAdmin(me: any) {
  return Boolean(me?.isAdmin);
}

type Outcome = 'CLIENT' | 'WORKER' | 'SPLIT';

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await ensureUserFromReq(req);
    if (!me) return NextResponse.json({ error: 'auth_required' }, { status: 401 });
    if (!requireAdmin(me)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const disputeId = String(params?.id || '').trim();
    if (!disputeId) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

    const body = (await req.json().catch(() => ({}))) as any;

    const outcome = String(body?.outcome || '').toUpperCase() as Outcome;
    const resultText = String(body?.resultText || '').trim().slice(0, 8000);

    const workerPctRaw = Number(body?.workerPct ?? NaN);
    const clientPctRaw = Number(body?.clientPct ?? NaN);

    if (!resultText) return NextResponse.json({ error: 'missing_result_text' }, { status: 400 });
    if (outcome !== 'CLIENT' && outcome !== 'WORKER' && outcome !== 'SPLIT') {
      return NextResponse.json({ error: 'invalid_outcome' }, { status: 400 });
    }

    const d = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        task: { select: { id: true, reward: true, authorId: true } },
        client: { select: { id: true, commissionPct: true } },
        worker: { select: { id: true } },
      },
    });
    if (!d) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (d.status === 'RESOLVED') return NextResponse.json({ ok: true }, { status: 200 });
    if (d.status === 'CANCELLED') return NextResponse.json({ error: 'locked' }, { status: 409 });

    const reward = Number(d.task?.reward || 0);
    if (!Number.isFinite(reward) || reward <= 0) {
      return NextResponse.json({ error: 'invalid_reward' }, { status: 409 });
    }

    const commissionPct = clampInt(Number(d.client?.commissionPct ?? 10), 0, 100);
    const commission = Math.floor((reward * commissionPct) / 100);
    const totalPaid = reward + commission;

    let workerAmount = 0;
    let clientAmount = 0;

    // ✅ RULES (როგორც შენ თქვი):
    // - commission + reward ერთად ბრუნდება დამკვეთს მხოლოდ მაშინ, თუ CLIENT მოიგებს
    // - SPLIT-ზე იყოფა მხოლოდ reward; commission არ ემატება დაბრუნებას
    // - WORKER-ზე reward მთლიანად მიდის worker-ზე; client-ს არ უნდა დაუბრუნდეს reward (commission-ს დაბრუნება შეგიძლია ჩათვალო როგორც "არ დაიკარგოს fee")
    if (outcome === 'WORKER') {
      workerAmount = reward;
      clientAmount = commission; // fee back (optional policy: keep fee or refund — შენს ძველ ლოგიკას ვიტოვებ)
    } else if (outcome === 'CLIENT') {
      workerAmount = 0;
      clientAmount = totalPaid; // ✅ full refund incl commission ONLY here
    } else {
      const workerPct = clampInt(workerPctRaw, 0, 100);
      const clientPct = clampInt(clientPctRaw, 0, 100);
      if (workerPct + clientPct !== 100) {
        return NextResponse.json({ error: 'split_must_sum_100' }, { status: 400 });
      }

      workerAmount = Math.floor((reward * workerPct) / 100);
      clientAmount = reward - workerAmount; // ✅ split ONLY reward
      // ❌ commission NOT returned on split
    }

    const splitJson = JSON.stringify({
      outcome,
      reward,
      commissionPct,
      commission,
      totalPaid,
      workerAmount,
      clientAmount,
      workerPct: outcome === 'SPLIT' ? clampInt(workerPctRaw, 0, 100) : null,
      clientPct: outcome === 'SPLIT' ? clampInt(clientPctRaw, 0, 100) : null,
    });

    await prisma.$transaction(async (tx) => {
      const fresh = await tx.dispute.findUnique({ where: { id: disputeId }, select: { status: true } });
      if (!fresh) throw new Error('not_found');
      if (fresh.status === 'RESOLVED') return;
      if (fresh.status === 'CANCELLED') throw new Error('locked');

      if (workerAmount > 0) {
        await tx.walletTransaction.create({
          data: {
            userId: d.workerId,
            counterpartyId: d.clientId,
            taskId: d.taskId,
            evidenceId: d.evidenceId,
            disputeId: d.id,
            type: 'EARNING',
            status: 'COMPLETED',
            amount: workerAmount,
            method: 'arbitration',
            description: `Dispute resolved: worker gets ₾${workerAmount}`,
          },
        });
      }

      if (clientAmount > 0) {
        await tx.walletTransaction.create({
          data: {
            userId: d.clientId,
            counterpartyId: d.workerId,
            taskId: d.taskId,
            evidenceId: d.evidenceId,
            disputeId: d.id,
            type: 'OTHER',
            status: 'COMPLETED',
            amount: clientAmount,
            method: 'arbitration',
            description: `Dispute resolved: client gets ₾${clientAmount}`,
          },
        });
      }

      await tx.dispute.update({
        where: { id: disputeId },
        data: {
          status: 'RESOLVED',
          resultText,
          splitJson,
          resolvedAt: new Date(),
          resolvedById: me.id,
          clientSeen: false,
          workerSeen: false,
        },
      });
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error('POST /api/admin/disputes/[id]/resolve error', e);
    const msg = String(e?.message || '');
    if (msg === 'locked') return NextResponse.json({ error: 'locked' }, { status: 409 });
    if (msg === 'not_found') return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
