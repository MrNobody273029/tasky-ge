// app/api/chats/threads/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getViewerId(): string | null {
  const id = cookies().get('x-user-id')?.value?.trim();
  return id && id.length > 0 ? id : null;
}

export async function GET(req: Request) {
  try {
    const uid = getViewerId();
    if (!uid) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    }

    const url = new URL(req.url);
    const summaryOnly = url.searchParams.get('summary') === '1';
    const limit = Math.min(
      50,
      Math.max(1, Number(url.searchParams.get('limit') || '20')),
    );

    const threads = await prisma.chatThread.findMany({
      where: {
        OR: [{ ownerId: uid }, { applicantId: uid }],
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: {
        task: {
          select: {
            id: true,
            title: true,
            exclusive: true,
            applications: {
              select: {
                id: true,
                applicantId: true,
                status: true,
              },
            },
          },
        },
        owner: {
          select: { id: true, name: true, email: true, image: true },
        },
        applicant: {
          select: { id: true, name: true, email: true, image: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, body: true, createdAt: true, authorId: true },
        },
      },
    });

    const mapped = threads.map((t) => {
      const iAmOwner = t.ownerId === uid;
      const other = iAmOwner ? t.applicant : t.owner;
      const last = t.messages[0] || null;

      // კონკრეტული აპლიკაცია ამ თრედისთვის (taskId + applicantId)
      const app =
        t.task.applications.find((a) => a.applicantId === t.applicantId) ||
        null;

      const appStatus = app?.status ?? null;
      const blocked = appStatus === 'REJECTED'; // აქ ვაბლოკავთ ჩატს
      const canWrite = !blocked;

      return {
        id: t.id,
        taskId: t.taskId,
        taskTitle: t.task.title,
        exclusive: t.task.exclusive,
        appStatus,
        canWrite,
        blocked,
        other: {
          id: other?.id,
          name: other?.name || (other?.email?.split('@')[0] ?? 'user'),
          image: other?.image ?? null,
        },
        lastMessage: last?.body ?? '',
        lastAt: (last?.createdAt ?? t.updatedAt).toISOString(),
        unread: iAmOwner ? t.hasUnreadForOwner : t.hasUnreadForApplicant,
      };
    });

    if (summaryOnly) {
      const unread = mapped.reduce((n, th) => n + (th.unread ? 1 : 0), 0);
      return NextResponse.json({ unreadTotal: unread }, { status: 200 });
    }

    return NextResponse.json({ threads: mapped }, { status: 200 });
  } catch (e) {
    console.error('GET /api/chats/threads error:', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
