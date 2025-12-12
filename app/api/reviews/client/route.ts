// app/api/reviews/client/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureUserFromReq } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const me = await ensureUserFromReq(req);
    if (!me) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

    const body = await req.json().catch(() => ({} as any));
    const toUserId = typeof body?.toUserId === 'string' ? body.toUserId.trim() : '';
    const taskId = typeof body?.taskId === 'string' ? body.taskId.trim() : '';
    const evidenceId = typeof body?.evidenceId === 'string' ? body.evidenceId.trim() : '';
    const starsRaw = Number(body?.stars);
    const comment = typeof body?.comment === 'string' ? body.comment.trim() : '';

    if (!toUserId || !taskId || !evidenceId) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    }

    const stars = Math.max(1, Math.min(5, Math.round(starsRaw || 0)));
    if (!stars) return NextResponse.json({ error: 'missing_stars' }, { status: 400 });

    const evidence = await prisma.taskEvidence.findUnique({
      where: { id: evidenceId },
      include: { task: true },
    });

    if (!evidence || evidence.taskId !== taskId || evidence.task.authorId !== toUserId) {
      return NextResponse.json({ error: 'invalid_context' }, { status: 400 });
    }
    if (evidence.authorId !== me.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    // allow rating on APPROVED or EXPIRED (as requested)
    if (evidence.status !== 'APPROVED' && evidence.status !== 'EXPIRED') {
      return NextResponse.json({ error: 'not_allowed' }, { status: 409 });
    }

    const exists = await prisma.review.findFirst({
      where: { fromUserId: me.id, toUserId, role: 'CLIENT', evidenceId },
      select: { id: true },
    });
    if (exists) return NextResponse.json({ ok: true, already: true }, { status: 200 });

    await prisma.$transaction(async (tx) => {
      await tx.review.create({
        data: {
          fromUserId: me.id,
          toUserId,
          role: 'CLIENT',
          taskId,
          evidenceId,
          stars,
          comment: comment.slice(0, 2000),
        },
      });

      const agg = await tx.review.aggregate({
        where: { toUserId, role: 'CLIENT' },
        _avg: { stars: true },
        _count: { stars: true },
      });

      await tx.user.update({
        where: { id: toUserId },
        data: {
          ratingClientAvg: Number(agg._avg.stars || 0),
          ratingClientCount: Number(agg._count.stars || 0),
        },
      });

      await tx.taskEvidence.update({
        where: { id: evidenceId },
        data: {
          workerReviewed: true,
          clientSawWorkerReview: false, // 🆕 notify client
        },
      });
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error('POST /api/reviews/client error', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
