// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureUserFromReq } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const me = await ensureUserFromReq(req);
    if (!me || !me.isAdmin) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const url = new URL(req.url);
    const takeRaw = Number(url.searchParams.get('take') ?? 50);
    const take = Number.isFinite(takeRaw)
      ? Math.min(100, Math.max(1, Math.floor(takeRaw)))
      : 50;
const users = await prisma.user.findMany({
  where: {
    isAdmin: false,   // 👈 ყველა ადმინს მალავს სიიდან
  },
  orderBy: { createdAt: 'desc' },
  take,
  select: {
    id: true,
    name: true,
    email: true,
    phone: true,
    image: true,
    createdAt: true,
    commissionPct: true,
    _count: {
      select: {
        tasks: true,
        claims: true,
      },
    },
  },
});


    const payload = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      image: u.image,
      createdAt: u.createdAt.toISOString(),
      commissionPct: u.commissionPct,
      tasksPosted: u._count.tasks,
      tasksTaken: u._count.claims,
    }));

    return NextResponse.json({ items: payload }, { status: 200 });
  } catch (e) {
    console.error('GET /api/admin/users error', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
