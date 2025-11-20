// app/api/me/reviews/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureUserFromReq } from '@/lib/auth';

/**
 * აბრუნებს ყველა review-ს, სადაც შენ ხარ valued user,
 * დაჯგუფების ლოგიკა: client | worker
 *
 * front-ზე მოგივა ასეთი shape:
 * { role: 'client' | 'worker'; stars: number; text: string; date: string }[]
 */
export async function GET(req: NextRequest) {
  try {
    const me = await ensureUserFromReq(req);
    if (!me) {
      return NextResponse.json({ error: 'auth_required' }, { status: 401 });
    }

    // მოვაქვს ყველა review-ს, სადაც მე ვარ მიმღები მხარე
    const rows = await prisma.review.findMany({
      where: { toUserId: me.id },
      orderBy: { createdAt: 'desc' },
    });

    const payload = rows.map((r) => ({
      // ReviewRole enum-იც [CLIENT | WORKER] ტიპის სტრინგია ბაზაში
      role: r.role === 'CLIENT' ? ('client' as const) : ('worker' as const),
      stars: r.stars,
      text: r.comment || '',
      date: r.createdAt.toISOString(),
    }));

    return NextResponse.json(payload);
  } catch (e: any) {
    console.error('GET /api/me/reviews error', e);
    return NextResponse.json(
      { error: e?.message || 'server error' },
      { status: 500 },
    );
  }
}
