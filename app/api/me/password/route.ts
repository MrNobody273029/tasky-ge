// app/api/me/password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureUserFromReq } from '@/lib/auth';
import { hashPassword, verifyPassword } from '@/lib/crypto';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function isStrongPassword(pw: string) {
  // "სწორი" სირთულე: მინ 8, მინ 1 ასო, მინ 1 ციფრი
  if (pw.length < 8) return false;
  if (!/[A-Za-z]/.test(pw)) return false;
  if (!/[0-9]/.test(pw)) return false;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const me = await ensureUserFromReq(req);
    if (!me) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as any;
    const currentPassword = String(body?.currentPassword ?? '');
    const newPassword = String(body?.newPassword ?? '');

    // ✅ როგორც შენ თქვი: current ყოველთვის აუცილებელია
    if (!currentPassword) {
      return NextResponse.json({ error: 'missing_current' }, { status: 400 });
    }
    if (!newPassword) {
      return NextResponse.json({ error: 'missing_new' }, { status: 400 });
    }
    if (!isStrongPassword(newPassword)) {
      return NextResponse.json({ error: 'weak_password' }, { status: 400 });
    }
    if (newPassword === currentPassword) {
      return NextResponse.json({ error: 'same_password' }, { status: 400 });
    }

    const row = await prisma.user.findUnique({
      where: { id: me.id },
      select: { id: true, passwordHash: true },
    });

    if (!row?.passwordHash) {
      // შენთან რეგისტრაციაზე ყოველთვის არის passwordHash,
      // მაგრამ მაინც დაცვა
      return NextResponse.json({ error: 'no_password_set' }, { status: 400 });
    }

    const ok = await verifyPassword(currentPassword, row.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: 'invalid_current' }, { status: 403 });
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: me.id },
      data: { passwordHash },
      select: { id: true },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error('POST /api/me/password error', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
