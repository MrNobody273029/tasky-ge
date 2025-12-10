// app/api/tasks/recomend/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** ამოიკითხოს viewer-ის userId: cookie → header → cookie(email)→DB lookup */
async function resolveUserIdFromReq(req: Request): Promise<string | null> {
  // cookie: x-user-id (Next.js-ის cookies() სერვერზე უსაფრთხოა)
  const cUid = cookies().get('x-user-id')?.value?.trim();
  if (cUid) return cUid;

  // header: x-user-id
  const hxUid = req.headers.get('x-user-id')?.trim();
  if (hxUid) return hxUid;

  // email როგორც ფოლბექი (header ან cookie-დან) → DB lookup
  const hxEmail =
    req.headers.get('x-email')?.trim() ||
    (() => {
      const raw = req.headers.get('cookie') || '';
      const m = raw.match(/(?:^|;\s*)email=([^;]+)/);
      return m ? decodeURIComponent(m[1]) : '';
    })();

  if (hxEmail) {
    try {
      const u = await prisma.user.findUnique({
        where: { email: hxEmail.toLowerCase() },
        select: { id: true },
      });
      if (u?.id) return u.id;
    } catch {
      // ჩუმად ჩავუვლით — guest-ად გავაგრძელებთ
    }
  }
  return null;
}

/** where-ით იპოვოს ერთ-ერთი random task.id; deterministic skip რომ იმუშაოს */
async function pickRandomTaskId(where: Prisma.TaskWhereInput) {
  const count = await prisma.task.count({ where });
  if (!count) return null;

  const skip = Math.floor(Math.random() * count);
  const rows = await prisma.task.findMany({
    where,
    orderBy: { id: 'asc' }, // deterministic skip
    skip,
    take: 1,
    select: { id: true },
  });
  return rows[0]?.id ?? null;
}

export async function GET(req: Request) {
  try {
    const userId = await resolveUserIdFromReq(req);

    // ── Guest: უბრალოდ ნებისმიერი PUBLISHED
    if (!userId) {
      const id = await pickRandomTaskId({ status: 'PUBLISHED' });
      if (!id) return NextResponse.json({ error: 'No tasks' }, { status: 404 });
      return NextResponse.json({ id });
    }

    // ── Auth: იუზერის ყველაზე ხშირი კატეგორია taken-ებიდან
    const claims = await prisma.taskClaim.findMany({
      where: { userId },
      select: { task: { select: { category: true } } },
    });

    // სიხშირეები
    const freq = new Map<string, number>();
    for (const c of claims) {
      const cat = (c.task?.category || '').trim();
      if (!cat) continue;
      freq.set(cat, (freq.get(cat) || 0) + 1);
    }

    // საწყისი where — ყოველთვის ვრიცხავთ საკუთარს და უკვე შენს მიერ აღებულს
    const baseNot: Prisma.TaskWhereInput[] = [
      { authorId: userId },             // შენი დადებული არ უნდა იყოს
      { claims: { some: { userId } } }, // უკვე შენ მიერ აღებული არ უნდა იყოს
    ];

    let id: string | null = null;

    if (freq.size > 0) {
      // ავირჩიოთ ყველაზე ხშირად ნაპოვნი კატეგორია(ები)
      let max = 0;
      for (const n of freq.values()) if (n > max) max = n;

      const topCats = [...freq.entries()]
        .filter(([, n]) => n === max)
        .map(([k]) => k);

      if (topCats.length > 0) {
        const pickedCat = topCats[Math.floor(Math.random() * topCats.length)];
        id = await pickRandomTaskId({
          status: 'PUBLISHED',
          category: pickedCat,
          NOT: baseNot,
        });
      }
    }

    // თუ top კატეგორიაში ვერ ვიპოვეთ, ვცადოთ ნებისმიერი PUBLISHED იგივე შეზღუდვებით
    if (!id) {
      id = await pickRandomTaskId({
        status: 'PUBLISHED',
        NOT: baseNot,
      });
    }

    if (!id) return NextResponse.json({ error: 'No tasks' }, { status: 404 });
    return NextResponse.json({ id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
