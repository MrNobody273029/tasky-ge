import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function getUid(req: NextRequest): string {
  const h = req.headers.get('x-user-id') || '';
  if (h) return h;
  const cookie = req.headers.get('cookie') || '';
  const m = cookie.match(/(?:^|;\s*)x-user-id=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const uid = getUid(req);
  if (!uid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { message?: string };

  const app = await prisma.taskApplication.findUnique({
    where: { id: params.id },
    include: { task: { select: { id: true, authorId: true } } },
  });

  if (!app) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (app.task.authorId !== uid) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  if (app.status !== 'PENDING') {
    return NextResponse.json({ error: 'already_decided', status: app.status }, { status: 409 });
  }

  const now = new Date();

  const msgText =
    typeof body?.message === 'string' && body.message.trim().length > 0
      ? body.message.trim()
      : 'დამატებული განაცხადი დადასტურდა. დავიწყოთ!';

  const result = await prisma.$transaction(async (tx) => {
    // 1) approve
    const approved = await tx.taskApplication.update({
      where: { id: app.id },
      data: {
        status: 'APPROVED',
        decidedAt: now,
        ownerSeen: true,
        ownerSeenAt: now,
      },
      select: { id: true, taskId: true, applicantId: true },
    });

    // 2) other apps reject
    await tx.taskApplication.updateMany({
      where: { taskId: approved.taskId, id: { not: approved.id } },
      data: { status: 'REJECTED', decidedAt: now },
    });

    // 3) claim winner (idempotent)
    await tx.taskClaim.upsert({
      where: { taskId_userId: { taskId: approved.taskId, userId: approved.applicantId } },
      create: { taskId: approved.taskId, userId: approved.applicantId },
      update: {},
    });

    // 4) upsert thread + unread for applicant
    const thread = await tx.chatThread.upsert({
      where: { taskId_applicantId: { taskId: approved.taskId, applicantId: approved.applicantId } },
      update: { hasUnreadForApplicant: true },
      create: {
        taskId: approved.taskId,
        ownerId: uid,
        applicantId: approved.applicantId,
        hasUnreadForOwner: false,
        hasUnreadForApplicant: true,
      },
      select: { id: true },
    });

    // 5) message
    await tx.chatMessage.create({
      data: { threadId: thread.id, authorId: uid, body: msgText },
    });

    return { threadId: thread.id };
  });

  return NextResponse.json({ ok: true, threadId: result.threadId }, { status: 200 });
}
