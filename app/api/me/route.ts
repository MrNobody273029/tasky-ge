// app/api/me/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

function getUserIdFromCookies(): string | null {
  const id = cookies().get('x-user-id')?.value?.trim();
  return id && id.length > 0 ? id : null;
}

export async function GET() {
  const id = getUserIdFromCookies();
  if (!id) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, phone: true, image: true },
  });

  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  return NextResponse.json(user, { status: 200 });
}

export async function PATCH(req: Request) {
  const id = getUserIdFromCookies();
  if (!id) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const data: { name?: string | null; phone?: string | null; image?: string | null } = {};

  if (typeof body.name === 'string')  data.name  = body.name.trim()  || null;
  if (typeof body.phone === 'string') data.phone = body.phone.trim() || null;
  if (typeof body.image === 'string' || body.image === null) data.image = body.image ?? null;

  // ❗️თუ არაფერია შესაცვლელი, დააბრუნე არსებული იუზერი (თავიდან Prisma update ცარიელი data-ით შეცდომას ისვრის)
  if (Object.keys(data).length === 0) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, phone: true, image: true },
    });
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    return NextResponse.json(user, { status: 200 });
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, name: true, phone: true, image: true },
  });

  return NextResponse.json(user, { status: 200 });
}
