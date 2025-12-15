// app/api/me/reviews/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureUserFromReq } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Out = {
  role: 'client' | 'worker';
  stars: number;
  text: string;
  date: string;

  // 🆕 optional extras (UI-ში fallback გაქვს)
  reviewerName?: string;
  reviewerId?: string;
  taskTitle?: string;
  taskId?: string;
};

function safeStr(v: unknown) {
  return typeof v === 'string' ? v.trim() : '';
}

export async function GET(req: NextRequest) {
  try {
    const me = await ensureUserFromReq(req);
    if (!me) {
      return NextResponse.json({ error: 'auth_required' }, { status: 401 });
    }

    // მინიმალური, სწრაფი query
    const rows = await prisma.review.findMany({
      where: { toUserId: me.id },
      orderBy: { createdAt: 'desc' },
      select: {
        role: true,
        stars: true,
        comment: true,
        createdAt: true,
        fromUserId: true,
        taskId: true,

        // თუ relations გაქვს schema-ში (უმეტეს შემთხვევაში გაქვს):
        fromUser: { select: { name: true, email: true } },
        task: { select: { title: true } },
      },
    });

    const payload: Out[] = rows.map((r) => {
      const role: Out['role'] = r.role === 'CLIENT' ? 'client' : 'worker';
      const stars = Number.isFinite(r.stars as any) ? Math.max(1, Math.min(5, r.stars)) : 5;

      const name =
        safeStr(r.fromUser?.name) ||
        safeStr(r.fromUser?.email ? String(r.fromUser.email).split('@')[0] : '') ||
        '—';

      return {
        role,
        stars,
        text: safeStr(r.comment),
        date: r.createdAt.toISOString(),

        reviewerName: name,
        reviewerId: r.fromUserId || undefined,
        taskTitle: safeStr(r.task?.title),
        taskId: r.taskId || undefined,
      };
    });

    return NextResponse.json(payload);
  } catch (e: any) {
    console.error('GET /api/me/reviews error', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
