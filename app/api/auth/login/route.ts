// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/crypto';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    const em = String(email || '').trim().toLowerCase();
    const pw = String(password || '');

    const user = await prisma.user.findUnique({ where: { email: em } });
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
    }

    const ok = await verifyPassword(pw, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
    }

    const res = NextResponse.json({ id: user.id, email: user.email }, { status: 200 });
    res.cookies.set({ name: 'x-user-id', value: user.id, path: '/', sameSite: 'lax' });
    res.cookies.set({ name: 'email', value: user.email, path: '/', sameSite: 'lax' });
    return res;
  } catch {
    return NextResponse.json({ error: 'login_failed' }, { status: 400 });
  }
}
