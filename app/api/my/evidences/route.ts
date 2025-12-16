// app/api/my/evidences/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureUserFromReq } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const user = await ensureUserFromReq(req);
    if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const tab = searchParams.get('tab') === 'outgoing' ? 'outgoing' : 'incoming';

    const evidences = await prisma.taskEvidence.findMany({
      where:
        tab === 'outgoing'
          ? { authorId: user.id }
          : { task: { authorId: user.id } },
      orderBy: { createdAt: 'desc' },
      include: {
        author: true,
        task: { include: { author: true } },
        fixFor: true,
        fixes: { select: { id: true }, take: 1 }, // ✅ just need to know if a child exists
        reviews: true,
        dispute: true,
      },
    });

    const payload = evidences.map((e) => {
      let photos: string[] = [];
      let videos: string[] = [];
      let files: string[] = [];
      try { photos = JSON.parse(e.photos || '[]'); } catch {}
      try { videos = JSON.parse(e.videos || '[]'); } catch {}
      try { files = JSON.parse(e.files || '[]'); } catch {}
const dispute = (e as any).dispute
  ? {
      status:
        (e as any).dispute.status === "RESOLVED" ? "RESOLVED"
        : (e as any).dispute.status === "SENT" ? "SENT"
        : (e as any).dispute.status === "WAITING_OTHER" || (e as any).dispute.status === "OPEN" ? "WAITING_OTHER"
        : (e as any).dispute.status === "BOTH_SUBMITTED" ? "BOTH_SUBMITTED"
        : "STARTED",
      startedAt: (e as any).dispute.startedAt?.toISOString?.() ?? null,
      deadlineAt: (e as any).dispute.deadlineAt?.toISOString?.() ?? null,
      resultText: (e as any).dispute.resultText || null,
      resolvedAt: (e as any).dispute.resolvedAt ? (e as any).dispute.resolvedAt.toISOString() : null,
      clientSeen: Boolean((e as any).dispute.clientSeen),
      workerSeen: Boolean((e as any).dispute.workerSeen),
      clientSubmitted: Boolean((e as any).dispute.clientSubmitted),
      workerSubmitted: Boolean((e as any).dispute.workerSubmitted),
    }
  : null;

      const clientToWorker =
        e.reviews.find((r) => r.role === 'WORKER' && r.toUserId === e.authorId) || null;

      const workerToClient =
        e.reviews.find((r) => r.role === 'CLIENT' && r.toUserId === e.task.authorId) || null;

      // ✅ parent NEEDS_FIXES countdown was stopped only when resubmitted on time
      const hasFixChild = Array.isArray((e as any).fixes) && (e as any).fixes.length > 0;
      const fixResubmittedOnTime =
        e.status === 'NEEDS_FIXES' && e.needsFixesAt === null && hasFixChild;

      return {
        id: e.id,
        createdAt: e.createdAt.toISOString(),
        decidedAt: e.decidedAt ? e.decidedAt.toISOString() : null,
        text: e.text,
        photos,
        videos,
        files,

        status: e.status,
        clientReviewed: e.clientReviewed,
        workerReviewed: e.workerReviewed,

        needsFixesReason: e.needsFixesReason ?? null,
        needsFixesAt: e.needsFixesAt ? e.needsFixesAt.toISOString() : null,
        autoApproved: Boolean(e.autoApproved),
        dispute,

        // ✅ new field for UI
        fixResubmittedOnTime,

        fixForId: (e as any).fixForId ?? null,
        fixFor: e.fixFor
          ? {
              id: e.fixFor.id,
              needsFixesReason: e.fixFor.needsFixesReason ?? null,
              needsFixesAt: e.fixFor.needsFixesAt ? e.fixFor.needsFixesAt.toISOString() : null,
            }
          : null,

        workerDecisionSeen: Boolean((e as any).workerDecisionSeen),
        clientSystemSeen: Boolean((e as any).clientSystemSeen),
        workerSawClientReview: Boolean((e as any).workerSawClientReview),
        clientSawWorkerReview: Boolean((e as any).clientSawWorkerReview),
        clientSawRatingPrompt: Boolean((e as any).clientSawRatingPrompt),
        workerSawRatingPrompt: Boolean((e as any).workerSawRatingPrompt),

        clientToWorkerReview: clientToWorker
          ? {
              stars: clientToWorker.stars,
              comment: clientToWorker.comment || '',
              fromUserId: clientToWorker.fromUserId,
              createdAt: clientToWorker.createdAt.toISOString(),
            }
          : null,

        workerToClientReview: workerToClient
          ? {
              stars: workerToClient.stars,
              comment: workerToClient.comment || '',
              fromUserId: workerToClient.fromUserId,
              createdAt: workerToClient.createdAt.toISOString(),
            }
          : null,

        task: {
          id: e.task.id,
          title: e.task.title,
          reward: e.task.reward,
          deadline: e.task.deadline ? e.task.deadline.toISOString() : null,
          where: e.task.where,
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
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
