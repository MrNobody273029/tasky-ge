// app/api/my/wallet/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureUserFromReq } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await ensureUserFromReq(req);
    if (!user) {
      return NextResponse.json({ error: 'auth_required' }, { status: 401 });
    }

    const txs = await prisma.walletTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        task: true,
        counterparty: true,
      },
    });

    let available = 0;
    let pending = 0;
    let hold = 0;
    let lifetime = 0;

    const payloadTx = txs.map((t) => {
      const isWalletMoney = t.method !== 'card'; // card != შიდა ბალანსი
      const rawType = t.type;     // 'EARNING' | 'PUBLISH_FEE' | 'WITHDRAWAL' | 'OTHER'
      const rawStatus = t.status; // 'COMPLETED' | 'PENDING' | 'FAILED' | 'ON_HOLD'
      const amount = t.amount;    // Int, შენ როგორც გამოიყენებ

      // UI ტიპი (იგივე სტრინგები რაც localStorage ვერსიაში გქონდა)
      let typeUi: string;
      if (rawType === 'EARNING') typeUi = 'Earning';
      else if (rawType === 'PUBLISH_FEE') typeUi = 'PublishFee';
      else if (rawType === 'WITHDRAWAL') typeUi = 'Withdrawal';
      else typeUi = 'Other';

      let statusUi: string;
      if (rawStatus === 'COMPLETED') statusUi = 'Completed';
      else if (rawStatus === 'PENDING') statusUi = 'Pending';
      else if (rawStatus === 'ON_HOLD') statusUi = 'OnHold';
      else statusUi = 'Failed';

      // summary-ების დათვლა – მაქსიმალურად ვიმეორებ ძველ ლოგიკას
      if (isWalletMoney) {
        if (rawStatus === 'COMPLETED') {
          available += amount;
        } else if (rawStatus === 'PENDING') {
          pending += amount;
        } else if (rawStatus === 'ON_HOLD') {
          hold += amount;
        }
      }


      if (rawType === 'EARNING' && amount > 0) {
        lifetime += amount;
      }

      return {
        id: t.id,
        date: t.createdAt.toISOString(),
        type: typeUi,
        taskTitle: t.task?.title ?? t.description ?? '',
        amount,
        status: statusUi,
        counterparty: t.counterparty?.name ?? t.counterparty?.email ?? '',
        method: t.method ?? '',
      };
    });

    // pending/hold UI-ში მაინც დადებითი გინდა
    pending = Math.max(0, pending);
    hold = Math.max(0, hold);

    return NextResponse.json({
      available,
      pending,
      hold,
      lifetime,
      tx: payloadTx,
    });
  } catch (e: any) {
    console.error('GET /api/my/wallet error', e);
    return NextResponse.json(
      { error: e?.message || 'server_error' },
      { status: 500 },
    );
  }
}
