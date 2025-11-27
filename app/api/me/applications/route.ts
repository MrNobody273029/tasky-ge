// app/api/me/applications/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

function getUserIdFromCookies(): string | null {
  const id = cookies().get('x-user-id')?.value?.trim();
  return id && id.length > 0 ? id : null;
}

type Role = 'owner' | 'applicant';
type AppStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

function mapStatusParam(v?: string | null): AppStatus | undefined {
  if (!v) return undefined;
  const s = v.toUpperCase();
  if (s === 'PENDING' || s === 'APPROVED' || s === 'REJECTED') return s as AppStatus;
  return undefined;
}

export async function GET(req: Request) {
  const uid = getUserIdFromCookies();
  if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const role: Role = (searchParams.get('role') === 'applicant' ? 'applicant' : 'owner');
  const status = mapStatusParam(searchParams.get('status'));
  const take = Math.min(100, Math.max(1, Number(searchParams.get('take') || 50)));

  // ---- filters ----
  const whereOwner = {
    task: { authorId: uid, exclusive: true },
    ...(status ? { status } : {}),
  };
  const whereApplicant = {
    applicantId: uid,
    ...(status ? { status } : {}),
  };

  // ---- list ----
  const apps = await prisma.taskApplication.findMany({
    where: role === 'owner' ? whereOwner : whereApplicant,
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true,
      taskId: true,
      applicantId: true,
      message: true,
      status: true,
      createdAt: true,
      decidedAt: true,
      task: {
        select: {
          id: true, title: true, reward: true, deadline: true,
          exclusive: true, status: true,
        },
      },
      applicant: {
        select: { id: true, name: true, email: true, phone: true, image: true },
      },
    },
  });

  // ↓↓↓ NEW: ერთი query ყველა შესაბამის thread-ზე ↓↓↓
  const pairMap = new Map<string, { taskId: string; applicantId: string }>();
  for (const a of apps) {
    const key = `${a.taskId}::${a.applicantId}`;
    if (!pairMap.has(key)) pairMap.set(key, { taskId: a.taskId, applicantId: a.applicantId });
  }

  let threadMap = new Map<string, {
    id: string;
    taskId: string;
    applicantId: string;
    hasUnreadForOwner: boolean;
    hasUnreadForApplicant: boolean;
    updatedAt: Date;
  }>();

  if (pairMap.size > 0) {
    const threadList = await prisma.chatThread.findMany({
      where: {
        OR: Array.from(pairMap.values()).map(p => ({
          taskId: p.taskId,
          applicantId: p.applicantId,
        })),
      },
      select: {
        id: true,
        taskId: true,
        applicantId: true,
        hasUnreadForOwner: true,
        hasUnreadForApplicant: true,
        updatedAt: true,
      },
    });

    threadMap = new Map(
      threadList.map(th => [`${th.taskId}::${th.applicantId}`, th] as const),
    );
  }
  // ↑↑↑ END NEW PART ↑↑↑

  // ---- attach chat thread + unread flag for current role ----
  const enriched = apps.map((a) => {
    const key = `${a.taskId}::${a.applicantId}`;
    const thread = threadMap.get(key);

    const unread =
      role === 'owner'
        ? Boolean(thread?.hasUnreadForOwner)
        : Boolean(thread?.hasUnreadForApplicant);

    return {
      id: a.id,
      status: a.status,
      message: a.message,
      createdAt: a.createdAt,
      decidedAt: a.decidedAt,
      task: {
        id: a.task.id,
        title: a.task.title,
        reward: a.task.reward,
        deadline: a.task.deadline ? a.task.deadline.toISOString() : null,
        exclusive: a.task.exclusive,
        status: a.task.status,
      },
      applicant: a.applicant,
      threadId: thread?.id || null,
      unread,
      threadUpdatedAt: thread?.updatedAt?.toISOString() || null,
    };
  });

  // ---- counters for red-dot badges ----
  const unreadTotal = await prisma.chatThread.count({
    where: role === 'owner'
      ? { ownerId: uid, hasUnreadForOwner: true }
      : { applicantId: uid, hasUnreadForApplicant: true },
  });

  const pendingTotal = await prisma.taskApplication.count({
    where: role === 'owner'
      ? { task: { authorId: uid, exclusive: true }, status: 'PENDING' }
      : { applicantId: uid, status: 'PENDING' },
  });

  return NextResponse.json({
    role,
    meta: { unreadTotal, pendingTotal },
    items: enriched,
  });
}
