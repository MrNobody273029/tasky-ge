// app/api/chats/[threadId]/messages/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureUserFromReq } from '@/lib/auth';

/** Helper: აბრუნებს თრედს მხოლოდ მაშინ, თუ მოთხოვნის ავტორი არის owner ან applicant */
async function getThreadForParticipant(threadId: string, userId: string) {
  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
    select: {
      id: true,
      taskId: true,
      ownerId: true,
      applicantId: true,
      hasUnreadForOwner: true,
      hasUnreadForApplicant: true,
    },
  });
  if (!thread) return null;
  if (thread.ownerId !== userId && thread.applicantId !== userId) return null;
  return thread;
}

/** 🆕 Helper: ამოწმებს, უარყოფილია თუ არა დაკავშირებული Application */
async function isThreadBlockedByApplication(taskId: string, applicantId: string): Promise<boolean> {
  const app = await prisma.taskApplication.findFirst({
    where: {
      taskId,
      applicantId,
    },
    select: { status: true },
  });

  if (!app) return false;           // თუ საერთოდ არ არსებობს – არ ვბლოკავთ
  return app.status === 'REJECTED'; // მხოლოდ REJECTED-ზე ვთვლით ბლოკად
}

/* -------------------- GET /api/chats/:threadId/messages --------------------
 * Query params:
 *   - limit?: number (default 30, 1..100)
 *   - cursor?: messageId (pagination cursor; when set, returns older messages)
 *   - markRead?: '1' | 'true'  (ვინ запросა ის მონიშნოს როგორც წაკითხული)
 *
 * Return: { items: MessageDTO[], nextCursor?: string }
 * MessageDTO = { id, authorId, body, createdAt }
 * ------------------------------------------------------------------------- */
export async function GET(req: Request, { params }: { params: { threadId: string } }) {
  try {
    const user = await ensureUserFromReq(req);
    if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

    const thread = await getThreadForParticipant(params.threadId, user.id);
    if (!thread) return NextResponse.json({ error: 'not_found_or_forbidden' }, { status: 404 });

    const url = new URL(req.url);
    const sp = url.searchParams;
    const limitRaw = Number(sp.get('limit') ?? 30);
    const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, Math.floor(limitRaw))) : 30;
    const cursor = (sp.get('cursor') || '').trim() || undefined;
    const markRead = ['1', 'true', 'yes'].includes((sp.get('markRead') || '').toLowerCase());

    const items = await prisma.chatMessage.findMany({
      where: { threadId: thread.id },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: { id: true, authorId: true, body: true, createdAt: true },
    });

    // სურვილისამებრ მონიშნე წაკითხულად
    if (markRead) {
      if (thread.ownerId === user.id) {
        await prisma.chatThread.update({
          where: { id: thread.id },
          data: { hasUnreadForOwner: false },
          select: { id: true },
        });
      } else {
        await prisma.chatThread.update({
          where: { id: thread.id },
          data: { hasUnreadForApplicant: false },
          select: { id: true },
        });
      }
    }

    const nextCursor = items.length === limit ? items[items.length - 1].id : undefined;

    // ვაბრუნებთ ქრონოლოგიურად ზრდადს (უმეტესად UI-სთვის მოსახერხებელია)
    const normalized = [...items].reverse();

    return NextResponse.json({ items: normalized, nextCursor }, { status: 200 });
  } catch (e) {
    console.error('GET /api/chats/[threadId]/messages error:', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

/* -------------------- POST /api/chats/:threadId/messages --------------------
 * Body: { body: string }
 * წესები:
 *  - მხოლოდ თრედის მონაწილეებს შეუძლიათ წერილობის გაგზავნა
 *  - გაგზავნისას მონიშნე "unread" მეორე მხარეს
 *  - თუ დაკავშირებული Application.status === REJECTED → ჩატი დაბლოკილია
 * ------------------------------------------------------------------------- */
export async function POST(req: Request, { params }: { params: { threadId: string } }) {
  try {
    const user = await ensureUserFromReq(req);
    if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

    const thread = await getThreadForParticipant(params.threadId, user.id);
    if (!thread) return NextResponse.json({ error: 'not_found_or_forbidden' }, { status: 404 });

    // 🆕 უარყოფილ მოთხოვნებზე საერთოდ არ ვუშვებთ ახალი მესიჯების გაგზავნას
    const blocked = await isThreadBlockedByApplication(thread.taskId, thread.applicantId);
    if (blocked) {
      return NextResponse.json(
        { error: 'chat_blocked', reason: 'application_rejected' },
        { status: 403 },
      );
    }

    const payload = await req.json().catch(() => ({} as any));
    const text = String(payload.body ?? '').trim();
    if (!text) return NextResponse.json({ error: 'empty_body' }, { status: 400 });
    if (text.length > 4000) return NextResponse.json({ error: 'too_long' }, { status: 413 });

    const msg = await prisma.chatMessage.create({
      data: {
        threadId: thread.id,
        authorId: user.id,
        body: text,
      },
      select: { id: true, authorId: true, body: true, createdAt: true },
    });

    // მონიშნე UNREAD მეორე მხარეს
    if (user.id === thread.ownerId) {
      await prisma.chatThread.update({
        where: { id: thread.id },
        data: { hasUnreadForApplicant: true },
        select: { id: true },
      });
    } else {
      await prisma.chatThread.update({
        where: { id: thread.id },
        data: { hasUnreadForOwner: true },
        select: { id: true },
      });
    }

    return NextResponse.json({ ok: true, message: msg }, { status: 201 });
  } catch (e) {
    console.error('POST /api/chats/[threadId]/messages error:', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
