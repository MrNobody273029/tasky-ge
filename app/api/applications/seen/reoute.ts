import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureUserFromReq } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const user = await ensureUserFromReq(req);
    if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

    const now = new Date();

    // მონიშნე ყველა PENDING ექსკლუზიური მოთხოვნა როგორც “ნახული” ავტორისთვის
    await prisma.taskApplication.updateMany({
      where: {
        status: 'PENDING',
        ownerSeen: false,
        task: { authorId: user.id, exclusive: true },
      },
      data: {
        ownerSeen: true,
        ownerSeenAt: now,
      },
    });

    return NextResponse.json({ ok: true }, { status: 200, headers: { 'cache-control': 'no-store' } });
  } catch (e) {
    console.error('POST /api/applications/seen error:', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
