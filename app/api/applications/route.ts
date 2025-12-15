import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function getUid(req: NextRequest): string {
  const h = req.headers.get('x-user-id') || '';
  if (h) return h;
  const cookie = req.headers.get('cookie') || '';
  const m = cookie.match(/(?:^|;\s*)x-user-id=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

export async function GET(req: NextRequest) {
  const uid = getUid(req);
  if (!uid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const incoming = url.searchParams.get('incoming');
  const exclusive = url.searchParams.get('exclusive');

  if (!incoming) return NextResponse.json({ items: [] }, { status: 200 });

  const apps = await prisma.taskApplication.findMany({
    where: {
      task: {
        authorId: uid,
        ...(exclusive ? { exclusive: true } : {}),
      },
    },
    include: {
      task: {
        select: {
          id: true,
          locale: true,
          title: true,
          desc: true,
          category: true,
          skill: true,
          reward: true,
          deadline: true,
          where: true,
          address: true,
          exclusive: true,
          status: true,
          photos: true,
          proof: true,
        },
      },
      applicant: {
        select: {
          id: true,
          name: true,
          image: true,
          ratingWorkerAvg: true,
          ratingWorkerCount: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // ✅ threads ერთ query-ში
  const pairMap = new Map<string, { taskId: string; applicantId: string }>();
  for (const a of apps) {
    const key = `${a.taskId}::${a.applicantId}`;
    if (!pairMap.has(key)) pairMap.set(key, { taskId: a.taskId, applicantId: a.applicantId });
  }

  let threadMap = new Map<string, { id: string }>();
  if (pairMap.size > 0) {
    const threadList = await prisma.chatThread.findMany({
      where: {
        OR: Array.from(pairMap.values()).map((p) => ({
          taskId: p.taskId,
          applicantId: p.applicantId,
        })),
      },
      select: { id: true, taskId: true, applicantId: true },
    });

    threadMap = new Map(
      threadList.map((th) => [`${th.taskId}::${th.applicantId}`, { id: th.id }] as const)
    );
  }

  const items = apps.map((a) => {
    const key = `${a.taskId}::${a.applicantId}`;
    const thread = threadMap.get(key);

    return {
      id: a.id,
      status: a.status,
      createdAt: a.createdAt.toISOString(),
      decidedAt: a.decidedAt ? a.decidedAt.toISOString() : null,
      message: a.message || '',
      threadId: thread?.id ?? null,

      // ✅ NEW (DB notification state)
      ownerSeen: a.ownerSeen,
      ownerSeenAt: a.ownerSeenAt ? a.ownerSeenAt.toISOString() : null,

      task: {
        id: a.task.id,
        locale: a.task.locale as 'ka' | 'en',
        title: a.task.title,
        desc: a.task.desc,
        category: a.task.category,
        skill: a.task.skill,
        reward: a.task.reward,
        deadline: a.task.deadline ? a.task.deadline.toISOString() : null,
        where: a.task.where,
        address: a.task.address,
        exclusive: a.task.exclusive,
        status: a.task.status,
        photos: (() => {
          try {
            return JSON.parse(a.task.photos || '[]') as string[];
          } catch {
            return [] as string[];
          }
        })(),
        proof: a.task.proof,
      },
      worker: {
        id: a.applicant.id,
        name: a.applicant.name,
        image: a.applicant.image,
        ratingWorkerAvg: a.applicant.ratingWorkerAvg,
        ratingWorkerCount: a.applicant.ratingWorkerCount,
      },
    };
  });

  return NextResponse.json({ items }, { status: 200 });
}
