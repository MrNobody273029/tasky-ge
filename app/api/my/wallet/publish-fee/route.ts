import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureUserFromReq } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await ensureUserFromReq(req);
    if (!user) {
      return NextResponse.json({ error: 'auth_required' }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as any;

    const rawAmount = Number(body?.amount ?? 0);
    const amount = Math.round(rawAmount); // Int (₾)
    const method = String(body?.method ?? '');
    const taskTitle = String(body?.taskTitle ?? '');
    const taskId = String(body?.taskId ?? '').trim(); // ✅ CRITICAL

    if (!taskId) {
      return NextResponse.json({ error: 'missing_task_id' }, { status: 400 });
    }

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'invalid_amount' }, { status: 400 });
    }

    if (method !== 'balance' && method !== 'card') {
      return NextResponse.json({ error: 'invalid_method' }, { status: 400 });
    }

    // 🔒 ვითვლით ხელმისაწვდომ ბალანსს (card არ ითვლება)
    const prev = await prisma.walletTransaction.findMany({
      where: { userId: user.id, status: 'COMPLETED' },
      select: { amount: true, method: true },
    });

    let available = 0;
    for (const t of prev) {
      if (t.method !== 'card') {
        available += t.amount;
      }
    }

    if (method === 'balance' && available < amount) {
      return NextResponse.json(
        { error: 'insufficient_balance', available },
        { status: 400 },
      );
    }

    // ✅ Publish fee transaction (WITH taskId)
    await prisma.walletTransaction.create({
      data: {
        userId: user.id,
        taskId, // ✅ აუცილებელია refund-ისთვის
        type: 'PUBLISH_FEE',
        status: 'COMPLETED',
        amount: -amount,
        method,
        description: taskTitle.slice(0, 190),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('POST /api/my/wallet/publish-fee error', e);
    return NextResponse.json(
      { error: e?.message || 'server_error' },
      { status: 500 },
    );
  }
}
