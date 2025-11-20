// app/api/applications/incoming/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

// პატარა ჰელპერი: ამოიკითხე ავტორი ქუქიდან (იგივე, რასაც სხვაგან იყენებ)
function getUserId() {
  const c = cookies();
  return (
    c.get('x-user-id')?.value ||
    c.get('uid')?.value ||
    ''
  );
}

export async function GET(req: Request) {
  const uid = getUserId();
  if (!uid) {
    return NextResponse.json({ items: [] }, { headers: { 'cache-control': 'no-store' } });
  }

  const url = new URL(req.url);
  const exclusiveOnly = url.searchParams.get('exclusive') === '1';

  // TaskCard-სთვის საჭირო ველები
  const taskSelect = {
    id: true,
    authorId: true,
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
  };

  // ---- სხვადასხვა შესაძლო მოდელის მცდელობა (სქემა შეიძლება ცოტა გვქონდეს განსხვავებული)
  const modelNames = ['taskApplication', 'application', 'taskRequest', 'taskApply'];

  let items: any[] = [];
  for (const name of modelNames) {
    const model = (prisma as any)[name];
    if (!model?.findMany) continue;

    try {
      const apps = await model.findMany({
        where: {
          task: {
            authorId: uid,
            ...(exclusiveOnly ? { exclusive: true } : {}),
          },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          task: { select: taskSelect },
          worker: {
            select: {
              id: true,
              name: true,
              image: true,
              // თუ ამ ველები სქემაში ასე არაა, undefined იქნება და 0-ზე დაიყრება
              ratingWorkerAvg: true,
              ratingWorkerCount: true,
            },
          },
        },
      });

      items = (apps || []).map((a: any) => ({
        id: a.id,
        status: a.status || 'PENDING',
        createdAt: a.createdAt ?? null,
        message: a.message ?? null,
        threadId: a.threadId ?? null,
        task: a.task,
        worker: {
          id: a.worker?.id,
          name: a.worker?.name ?? null,
          image: a.worker?.image ?? null,
          ratingWorkerAvg: a.worker?.ratingWorkerAvg ?? 0,
          ratingWorkerCount: a.worker?.ratingWorkerCount ?? 0,
        },
      }));

      break; // ಮೊದಲივე წარმატებული მოდელი საკმარისია
    } catch {
      // ცადე შემდეგი შესაძლო მოდელი
    }
  }

  // თუ ზემოთ ვერაფერი მოიძებნა — მაინც დააბრუნე ცარიელი ლისტი, რომ UI მშვიდად იმუშავოს
  return NextResponse.json({ items }, { headers: { 'cache-control': 'no-store' } });
}
