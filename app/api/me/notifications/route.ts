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

  // ✅ Requests (as task owner): pending unseen exclusive
  const pendingRequests = await prisma.taskApplication.count({
    where: {
      status: 'PENDING',
      ownerSeen: false,
      task: { authorId: uid, exclusive: true },
    },
  });

  // ✅ Chats: unread for owner + unread for applicant (if user is applicant somewhere)
  const unreadChatsAsOwner = await prisma.chatThread.count({
    where: { ownerId: uid, hasUnreadForOwner: true },
  });

  const unreadChatsAsApplicant = await prisma.chatThread.count({
    where: { applicantId: uid, hasUnreadForApplicant: true },
  });

  // ✅ Evidence notifications (worker side + client side) based on your schema flags
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

  // client side: task owner == uid OR decidedById == uid (you use owner in flows)
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
        total: pendingRequests + unreadChatsAsOwner + unreadChatsAsApplicant + evidenceWorkerNotifs + evidenceClientNotifs,
      },
    },
    { status: 200, headers: { 'cache-control': 'no-store' } }
  );
}
