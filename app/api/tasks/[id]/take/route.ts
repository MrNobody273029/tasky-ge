import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureUserFromReq } from '@/lib/auth';
import { revalidatePath, revalidateTag } from 'next/cache';

function guessLocaleFromReq(req: Request): string[] {
  try {
    const ref = req.headers.get('referer');
    if (ref) {
      const p = new URL(ref).pathname.split('/').filter(Boolean);
      if (p[0]) return [p[0]];
    }
  } catch {}
  return ['ka'];
}

function invalidateUIAfterMutation(req: Request, taskId: string) {
  const locales = guessLocaleFromReq(req);

  revalidateTag('tasks');
  revalidateTag('task-claims');
  revalidateTag(`task:${taskId}`);

  for (const loc of locales) {
    revalidatePath(`/${loc}/mypage/taken`, 'page');
    revalidatePath(`/${loc}/mypage/created`, 'page');
    revalidatePath(`/${loc}/tasks`, 'page');
    revalidatePath(`/${loc}/tasks/${taskId}`, 'page');
  }
}

/* --------- Take (claim) --------- */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const taskId = params.id;

  try {
    const user = await ensureUserFromReq(req); // 🔒 auth + user row
    if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, authorId: true, status: true },
    });
    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if ((task.authorId || '').toLowerCase() === user.id.toLowerCase()) {
      return NextResponse.json({ error: 'Cannot take own task' }, { status: 400 });
    }
    if (task.status !== 'PUBLISHED') {
      return NextResponse.json({ error: 'Task is not published' }, { status: 400 });
    }

    try {
      const claim = await prisma.taskClaim.create({
        data: { taskId: task.id, userId: user.id },
        select: { id: true, createdAt: true },
      });

      invalidateUIAfterMutation(req, task.id);
      return NextResponse.json({ ok: true, claimId: claim.id });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        return NextResponse.json({ error: 'Already taken' }, { status: 400 });
      }
      throw e;
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/* --------- Return (delete claim) --------- */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await ensureUserFromReq(req); // 🔒
    if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

    const taskId = params.id;

    await prisma.taskClaim.delete({
      where: { taskId_userId: { taskId, userId: user.id } },
    });

    invalidateUIAfterMutation(req, taskId);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.code === 'P2025') {
      return NextResponse.json({ error: 'Not claimed' }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
