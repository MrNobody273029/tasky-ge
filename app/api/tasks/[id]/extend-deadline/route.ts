// app/api/tasks/[id]/extend-deadline/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureUserFromReq } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

function startOfTomorrow(): Date {
  const now = new Date();
  const t = new Date(now);
  t.setHours(0, 0, 0, 0);
  t.setDate(t.getDate() + 1);
  return t;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await ensureUserFromReq(req);
    if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

    const taskId = (params?.id || '').trim();
    if (!taskId) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

    const body = (await req.json().catch(() => ({}))) as any;
    const raw = body?.deadline;

    if (!raw) return NextResponse.json({ error: 'missing_deadline' }, { status: 400 });

    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: 'invalid_deadline' }, { status: 400 });
    }
    if (d.getTime() < startOfTomorrow().getTime()) {
      return NextResponse.json({ error: 'deadline_too_soon' }, { status: 400 });
    }

    const task = await prisma.task.findFirst({
      where: { id: taskId, authorId: user.id },
      select: { id: true, locale: true, title: true, exclusive: true },
    });
    if (!task) return NextResponse.json({ error: 'not_found_or_forbidden' }, { status: 404 });

    // safety: do not allow extending if there is ongoing/approved evidence
    const blockingEvidence = await prisma.taskEvidence.findFirst({
      where: { taskId: task.id, status: { in: ['PENDING', 'NEEDS_FIXES', 'APPROVED'] } },
      select: { id: true },
    });
    if (blockingEvidence) {
      return NextResponse.json({ error: 'cannot_extend_with_evidence' }, { status: 409 });
    }

    // safety: for exclusive — if already assigned to someone (approved app), do not extend
    if (task.exclusive) {
      const approvedApp = await prisma.taskApplication.findFirst({
        where: { taskId: task.id, status: 'APPROVED' },
        select: { id: true },
      });
      if (approvedApp) {
        return NextResponse.json({ error: 'cannot_extend_assigned_task' }, { status: 409 });
      }
    }

    await prisma.task.update({
      where: { id: task.id },
      data: { deadline: d },
    });

    const loc = task.locale === 'en' ? 'en' : 'ka';
    revalidatePath(`/${loc}/mypage/created`);
    revalidatePath(`/${loc}/tasky`);
    revalidatePath(`/${loc}`);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error('POST /api/tasks/[id]/extend-deadline error:', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
