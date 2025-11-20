// app/api/users/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: Request,
  ctx: { params: { id?: string } }
) {
  try {
    const id = String(ctx.params?.id || '').trim();
    if (!id) {
      return NextResponse.json({ error: 'missing_id' }, { status: 400 });
    }

 const user = await prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    email: true,
    name: true,
    phone: true,
    image: true,
    // ახალ დათვლები როგორც დამკვეთის
    ratingClientAvg: true,
    ratingClientCount: true,
  },
});


    if (!user) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json(user, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'users_fetch_failed' }, { status: 400 });
  }
}
