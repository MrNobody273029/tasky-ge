// app/api/chats/[threadId]/read/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureUserFromReq } from '@/lib/auth';

/**
 * POST /api/chats/:threadId/read
 * მონიშნავს ჩათის თრედს როგორც წაკითხულს მოთხოვნის ავტორისთვის.
 * აბრუნებს { ok: true, threadId, viewerRole: 'owner'|'applicant' }.
 */
export async function POST(req: Request, { params }: { params: { threadId: string } }) {
  try {
    const user = await ensureUserFromReq(req);
    if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

    const thread = await prisma.chatThread.findUnique({
      where: { id: params.threadId },
      select: { id: true, ownerId: true, applicantId: true },
    });
    if (!thread) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    let viewerRole: 'owner' | 'applicant';
    if (thread.ownerId === user.id) viewerRole = 'owner';
    else if (thread.applicantId === user.id) viewerRole = 'applicant';
    else return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    await prisma.chatThread.update({
      where: { id: thread.id },
      data:
        viewerRole === 'owner'
          ? { hasUnreadForOwner: false }
          : { hasUnreadForApplicant: false },
      select: { id: true },
    });

    return NextResponse.json(
      { ok: true, threadId: thread.id, viewerRole },
      { status: 200 },
    );
  } catch (e) {
    console.error('POST /api/chats/[threadId]/read error:', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
