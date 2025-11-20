import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/crypto';

export async function POST(req: Request) {
  try {
    const { email, password, name, phone } = await req.json();
    const em = String(email || '').trim().toLowerCase();
    const pw = String(password || '');
    const uname = String(name || '').trim();
    const ph = String(phone || '').trim();

    if (!em || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
    }
    if (pw.length < 6) {
      return NextResponse.json({ error: 'weak_password' }, { status: 400 });
    }

    // უნიკალურობის შემოწმებები
    const [byEmail, byPhone, byName] = await Promise.all([
      prisma.user.findUnique({ where: { email: em }, select: { id: true } }),
      ph ? prisma.user.findUnique({ where: { phone: ph }, select: { id: true } }) : Promise.resolve(null),
      uname ? prisma.user.findUnique({ where: { name: uname }, select: { id: true } }) : Promise.resolve(null),
    ]);

    if (byEmail) {
      return NextResponse.json({ error: 'email_taken' }, { status: 409 });
    }
    if (byPhone) {
      return NextResponse.json({ error: 'phone_taken' }, { status: 409 });
    }
    if (byName) {
      return NextResponse.json({ error: 'username_taken' }, { status: 409 });
    }

    const passwordHash = await hashPassword(pw);
    const user = await prisma.user.create({
      data: {
        email: em,
        passwordHash,
        name: uname || null,
        phone: ph || null,
      },
      select: { id: true, email: true },
    });

    const res = NextResponse.json(user, { status: 201 });
    // dev-cookie (შენი არსებული ფლოუსთან თავსებადობისთვის)
    res.cookies.set({ name: 'x-user-id', value: user.id, path: '/', sameSite: 'lax' });
    res.cookies.set({ name: 'email', value: user.email, path: '/', sameSite: 'lax' });
    return res;
  } catch (e) {
    return NextResponse.json({ error: 'register_failed' }, { status: 400 });
  }
}
