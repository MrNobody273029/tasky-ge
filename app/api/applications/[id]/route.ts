// app/api/applications/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureUserFromReq } from '@/lib/auth';

/**
 * PATCH /api/applications/:id
 * Body: { action: 'approve' | 'reject', message?: string }
 *
 * წესები:
 * - მხოლოდ ტასკის ავტორს შეუძლია გადაწყვეტილება.
 * - მხოლოდ PENDING განაცხადზე მუშაობს.
 * - approve-ზე: განაცხადი APPROVED, იქმნება/ინარჩუნებს TaskClaim-ს (winner),
 *   იგივე ტასკის სხვა განაცხადები გადადის REJECTED-ში,
 *   იქმნება/განახლდება ჩათ-თრედი და მონიშნავს unread-ს აპლიკანტისთვის.
 * - reject-ზე: განაცხადი REJECTED და აპლიკანტისთვის ჩაითვლება unread.
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await ensureUserFromReq(req);
    if (!user) {
      return NextResponse.json({ error: 'auth_required' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({} as any));
    const action = String(body.action || '').toLowerCase();

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
    }

    // მოიტანე განაცხადი + ტასკი (ავტორის იდენტისთვის)
    const app = await prisma.taskApplication.findUnique({
      where: { id: params.id },
      include: { task: { select: { id: true, authorId: true, exclusive: true } } },
    });

    if (!app) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // მხოლოდ ავტორი
    if (app.task.authorId !== user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    // უკვე მიღებულია გადაწყვეტილება?
    if (app.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'already_decided', status: app.status },
        { status: 409 }
      );
    }

    const now = new Date();

    if (action === 'approve') {
      // 1) განაცხადის დამტკიცება
      const approved = await prisma.taskApplication.update({
        where: { id: app.id },
        data: { status: 'APPROVED', decidedAt: now },
        select: { id: true, applicantId: true, taskId: true },
      });

      // 2) Winner-ის TaskClaim (idempotent)
      await prisma.taskClaim.upsert({
        where: {
          taskId_userId: { taskId: approved.taskId, userId: approved.applicantId },
        },
        create: { taskId: approved.taskId, userId: approved.applicantId },
        update: {},
      });

      // 3) სხვა ყველა განაცხადის უარყოფა იმავე ტასკზე
      await prisma.taskApplication.updateMany({
        where: { taskId: approved.taskId, id: { not: approved.id } },
        data: { status: 'REJECTED', decidedAt: now },
      });

      // 4) ჩათის თრედი (owner ↔ applicant) — mark unread for applicant
      const thread = await prisma.chatThread.upsert({
        where: {
          taskId_applicantId: {
            taskId: approved.taskId,
            applicantId: approved.applicantId,
          },
        },
        update: { hasUnreadForApplicant: true },
        create: {
          taskId: approved.taskId,
          ownerId: app.task.authorId,
          applicantId: approved.applicantId,
          hasUnreadForOwner: false,
          hasUnreadForApplicant: true,
        },
        select: { id: true },
      });

      // პირველი (არასავალდებულო) მესიჯი ავტორისგან
      const msgText =
        typeof body.message === 'string' && body.message.trim().length > 0
          ? body.message.trim()
          : 'დამატებული განაცხადი დადასტურდა. დავიწყოთ!';

      await prisma.chatMessage.create({
        data: {
          threadId: thread.id,
          authorId: user.id,
          body: msgText,
        },
      });

      return NextResponse.json(
        {
          ok: true,
          status: 'APPROVED',
          claimCreated: true,
          threadId: thread.id,
        },
        { status: 200 }
      );
    }

    // action === 'reject'
    const rejected = await prisma.taskApplication.update({
      where: { id: app.id },
      data: { status: 'REJECTED', decidedAt: now },
      select: { id: true, applicantId: true, taskId: true },
    });

    // ჩათ-თრედი (რომ წითელი წერტილი ამოარდეს აპლიკანტს)
    const thread = await prisma.chatThread.upsert({
      where: {
        taskId_applicantId: {
          taskId: rejected.taskId,
          applicantId: rejected.applicantId,
        },
      },
      update: { hasUnreadForApplicant: true },
      create: {
        taskId: rejected.taskId,
        ownerId: app.task.authorId,
        applicantId: rejected.applicantId,
        hasUnreadForOwner: false,
        hasUnreadForApplicant: true,
      },
      select: { id: true },
    });

    const msgText =
      typeof body.message === 'string' && body.message.trim().length > 0
        ? body.message.trim()
        : 'სამწუხაროდ განაცხადი უარყოფილია. გმადლობთ დაინტერესებისთვის.';

    await prisma.chatMessage.create({
      data: {
        threadId: thread.id,
        authorId: user.id,
        body: msgText,
      },
    });

    return NextResponse.json(
      { ok: true, status: 'REJECTED', threadId: thread.id },
      { status: 200 }
    );
  } catch (e) {
    console.error('PATCH /api/applications/[id] error:', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
