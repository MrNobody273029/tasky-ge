// app/api/my/evidences/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureUserFromReq } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const user = await ensureUserFromReq(req);
    if (!user) {
      return NextResponse.json({ error: 'auth_required' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tab = searchParams.get('tab') === 'outgoing' ? 'outgoing' : 'incoming';

    const evidences = await prisma.taskEvidence.findMany({
      where:
        tab === 'outgoing'
          ? { authorId: user.id } // ჩემი გაგზავნილი
          : { task: { authorId: user.id } }, // ჩემთან გამოგზავნილი (მე ვარ დამკვეთი)
      orderBy: { createdAt: 'desc' },
      include: {
        author: true, // worker – ვინც გამოაგზავნა
        task: {
          include: {
            author: true, // client – დავალების ავტორი
          },
        },
      },
    });

    const payload = evidences.map((e) => {
      let photos: string[] = [];
      let videos: string[] = [];
      let files: string[] = [];
      try {
        photos = JSON.parse(e.photos || '[]');
      } catch {}
      try {
        videos = JSON.parse(e.videos || '[]');
      } catch {}
      try {
        files = JSON.parse(e.files || '[]');
      } catch {}

      return {
        id: e.id,
        createdAt: e.createdAt.toISOString(),
        text: e.text,
        photos,
        videos,
        files,
        status: e.status,
        clientReviewed: e.clientReviewed,
        workerReviewed: e.workerReviewed,
        task: {
          id: e.task.id,
          title: e.task.title,
          reward: e.task.reward,
          deadline: e.task.deadline
            ? e.task.deadline.toISOString()
            : null,
          where: e.task.where, // 'REMOTE' | 'ONSITE'
          exclusive: e.task.exclusive,
          locale: e.task.locale,
          category: e.task.category,
          skill: e.task.skill,
        },
       worker: {
        id: e.author.id,
        name: e.author.name,
        email: e.author.email,
        image: e.author.image,
        ratingWorkerAvg: e.author.ratingWorkerAvg,
        ratingWorkerCount: e.author.ratingWorkerCount,
      },

        client: {
          id: e.task.author.id,
          name: e.task.author.name,
          email: e.task.author.email,
          image: e.task.author.image,
        },
      };
    });

    return NextResponse.json(payload);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message || 'Server error' },
      { status: 500 },
    );
  }
}
