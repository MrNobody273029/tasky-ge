// app/api/my/payout-accounts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureUserFromReq } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function normalizeAccount(s: string) {
  // ვტოვებთ მხოლოდ ასო/ციფრებს, ვაშორებთ space/dash-ს — IBAN friendly
  return s.replace(/[\s-]/g, '').trim();
}

export async function GET(req: NextRequest) {
  try {
    const me = await ensureUserFromReq(req);
    if (!me) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

    const rows = await prisma.payoutAccount.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, account: true, createdAt: true },
    });

    return NextResponse.json(
      rows.map((r) => ({
        id: r.id,
        account: r.account,
        createdAt: r.createdAt.toISOString(),
      })),
      { status: 200 },
    );
  } catch (e: any) {
    console.error('GET /api/my/payout-accounts error', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await ensureUserFromReq(req);
    if (!me) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as any;
    const raw = String(body?.account ?? '');
    const account = normalizeAccount(raw);

    if (!account || account.length < 8) {
      return NextResponse.json({ error: 'invalid_account' }, { status: 400 });
    }

    // unique([userId, account]) დაიჭერს დუბლიკატს
    const created = await prisma.payoutAccount.create({
      data: { userId: me.id, account },
      select: { id: true, account: true, createdAt: true },
    });

    return NextResponse.json(
      { id: created.id, account: created.account, createdAt: created.createdAt.toISOString() },
      { status: 201 },
    );
  } catch (e: any) {
    // unique conflict
    if (String(e?.code) === 'P2002') {
      return NextResponse.json({ error: 'already_exists' }, { status: 409 });
    }
    console.error('POST /api/my/payout-accounts error', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
