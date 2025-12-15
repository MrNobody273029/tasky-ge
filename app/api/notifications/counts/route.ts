import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureUserFromReq } from '@/lib/auth';

export async function GET(req: Request) {
  const user = await ensureUserFromReq(req);
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

  const uid = user.id;

  // Requests (as task owner): pending unseen exclusive
  const pendingRequests = await prisma.taskApplication.count({
    where: {
      status: 'PENDING',
      ownerSeen: false,
      task: { authorId: uid, exclusive: true },
    },
  });

  // Chats unread: owner + applicant
  const unreadChatsAsOwner = await prisma.chatThread.count({
    where: { ownerId: uid, hasUnreadForOwner: true },
  });

  const unreadChatsAsApplicant = await prisma.chatThread.count({
    where: { applicantId: uid, hasUnreadForApplicant: true },
  });

  // Evidence notifications
  const evidenceWorkerNotifs = await prisma.taskEvidence.count({
    where: {
      authorId: uid,
      OR: [
        { workerDecisionSeen: false },
        { workerSawClientReview: false },
        { workerSawRatingPrompt: false },
      ],
    },
  });

  const evidenceClientNotifs = await prisma.taskEvidence.count({
    where: {
      task: { authorId: uid },
      OR: [
        { clientSystemSeen: false },
        { clientSawWorkerReview: false },
        { clientSawRatingPrompt: false },
      ],
    },
  });

  return NextResponse.json(
    {
      ok: true,
      counts: {
        requests: pendingRequests,
        chats: unreadChatsAsOwner + unreadChatsAsApplicant,
        chatsAsOwner: unreadChatsAsOwner,
        chatsAsApplicant: unreadChatsAsApplicant,
        evidencesWorker: evidenceWorkerNotifs,
        evidencesClient: evidenceClientNotifs,
        total:
          pendingRequests +
          unreadChatsAsOwner +
          unreadChatsAsApplicant +
          evidenceWorkerNotifs +
          evidenceClientNotifs,
      },
    },
    { status: 200, headers: { 'cache-control': 'no-store' } },
  );
}
