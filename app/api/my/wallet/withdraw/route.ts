// app/api/my/wallet/withdraw/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureUserFromReq } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DAILY_LIMIT = 500; // ₾ (24 საათში)

export async function POST(req: NextRequest) {
  try {
    const me = await ensureUserFromReq(req);
    if (!me) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as any;
    const rawAmount = Number(body?.amount ?? 0);
    const amount = Math.round(rawAmount); // Int ₾
    const accountId = String(body?.accountId ?? '').trim();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'invalid_amount' }, { status: 400 });
    }
    if (!accountId) {
      return NextResponse.json({ error: 'missing_account' }, { status: 400 });
    }

    const account = await prisma.payoutAccount.findFirst({
      where: { id: accountId, userId: me.id },
      select: { id: true, account: true },
    });
    if (!account) {
      return NextResponse.json({ error: 'account_not_found' }, { status: 404 });
    }

    const now = new Date();
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const result = await prisma.$transaction(async (tx) => {
      // 1) current available (ONLY internal money, ignore card; only COMPLETED)
      const completed = await tx.walletTransaction.findMany({
        where: { userId: me.id, status: 'COMPLETED' },
        select: { amount: true, method: true },
      });

      let available = 0;
      for (const t of completed) {
        if (t.method !== 'card') available += t.amount; // includes negatives
      }

      if (available < amount) {
        return { ok: false as const, error: 'insufficient_balance' as const, available };
      }

      // 2) 24h withdrawals sum (absolute)
      const last24h = await tx.walletTransaction.aggregate({
        where: {
          userId: me.id,
          type: 'WITHDRAWAL',
          status: 'COMPLETED',
          createdAt: { gte: since },
        },
        _sum: { amount: true },
      });

      // WITHDRAWAL amount stored negative, e.g. -100
      const used = Math.abs(Number(last24h._sum.amount ?? 0));
      if (used + amount > DAILY_LIMIT) {
        return {
          ok: false as const,
          error: 'daily_limit' as const,
          limit: DAILY_LIMIT,
          used,
          remaining: Math.max(0, DAILY_LIMIT - used),
        };
      }

      // 3) create withdrawal tx (demo: COMPLETED პირდაპირ)
      await tx.walletTransaction.create({
        data: {
          userId: me.id,
          type: 'WITHDRAWAL',
          status: 'COMPLETED',
          amount: -amount,
          method: 'balance',
          description: `Withdrawal to ${account.account}`.slice(0, 190),
        },
        select: { id: true },
      });

      // 4) new available
      const completedAfter = await tx.walletTransaction.findMany({
        where: { userId: me.id, status: 'COMPLETED' },
        select: { amount: true, method: true },
      });

      let newAvailable = 0;
      for (const t of completedAfter) {
        if (t.method !== 'card') newAvailable += t.amount;
      }

      return { ok: true as const, available: newAvailable };
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json({ ok: true, available: result.available }, { status: 200 });
  } catch (e: any) {
    console.error('POST /api/my/wallet/withdraw error', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
