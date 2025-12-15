// app/api/tasks/[id]/apply/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureUserFromReq } from '@/lib/auth';

function isDeadlinePassed(deadline: Date | null): boolean {
  if (!deadline) return false;
  return deadline.getTime() < Date.now();
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    // 1) auth (უზრუნველყოფს User row-საც)
    const user = await ensureUserFromReq(req);
    if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

    // 2) body
    const body = await req.json().catch(() => ({} as any));
    const rawMsg = (body?.message ?? '').toString();
    const message = rawMsg.trim();

    // 3) task
    const task = await prisma.task.findUnique({
      where: { id: params.id },
    });
    if (!task) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    if (isDeadlinePassed(task.deadline ?? null)) {
      return NextResponse.json({ error: 'deadline_passed' }, { status: 409 });
    }

    if (task.status !== 'PUBLISHED') {
      return NextResponse.json({ error: 'not_published' }, { status: 400 });
    }
    if (!task.exclusive) {
      // არაექსკლუზიურზე „apply“ არ ვაკეთებთ (იქ „take“ იქნება)
      return NextResponse.json({ error: 'not_exclusive' }, { status: 400 });
    }
    if (task.authorId === user.id) {
      return NextResponse.json({ error: 'cannot_apply_own_task' }, { status: 400 });
    }

    // 3.5) თუ უკვე ჰყავს APPROVED აპლიკანტი ამ ტასკს (exclusive winner),
    // სხვებს აღარ მივცეთ განაცხადის გაგზავნა
    const approvedForTask = await prisma.taskApplication.findFirst({
      where: { taskId: task.id, status: 'APPROVED' },
      select: { id: true, applicantId: true },
    });

    if (approvedForTask && approvedForTask.applicantId !== user.id) {
      return NextResponse.json({ error: 'already_assigned' }, { status: 400 });
    }

    // 4) ვცადოთ არსებული განაცხადის წამოღება (unique: taskId+applicantId)
    const existing = await prisma.taskApplication.findUnique({
      where: { taskId_applicantId: { taskId: task.id, applicantId: user.id } },
      select: { id: true, status: true },
    }).catch(() => null);

    let appId: string;
    let appStatus: 'PENDING' | 'APPROVED' | 'REJECTED';

    if (!existing) {
      // ► ახალი განაცხადი
      const app = await prisma.taskApplication.create({
        data: {
          taskId: task.id,
          applicantId: user.id,
          message,
          status: 'PENDING',
          ownerSeen: false,
          ownerSeenAt: null,
        },
        select: { id: true, status: true },
      });
      appId = app.id;
      appStatus = app.status as any;
    } else {
      // ► უკვე არსებობს
      if (existing.status === 'APPROVED') {
        // უკვე დამტკიცებულია — OK ვაბრუნებთ (id/status), მაგრამ არაფერს ვცვლით
        return NextResponse.json(
          {
            ok: true,
            application: { id: existing.id, status: 'APPROVED' },
            note: 'already_approved',
          },
          { status: 200 },
        );
      }
      if (existing.status === 'REJECTED') {
        // ❌ შენს მოთხოვნაზე: უარყოფის შემდეგ აღარ შეიძლება ხელახალი გაგზავნა
        return NextResponse.json({ error: 'rejected_locked' }, { status: 400 });
      }
      // PENDING → მხოლოდ მესიჯის განახლება (ნებაყოფლობით)
      const upd = await prisma.taskApplication.update({
        where: { taskId_applicantId: { taskId: task.id, applicantId: user.id } },
        data: { message },
        select: { id: true, status: true },
      });
      appId = upd.id;
      appStatus = upd.status as any;
    }

    // 5) ჩათის თრედი: თითო ტასკი × აპლიკანტი → ერთი თრედი
    // ownerId = task.authorId, applicantId = user.id
    let thread = await prisma.chatThread.findUnique({
      where: { taskId_applicantId: { taskId: task.id, applicantId: user.id } },
    });

    if (!thread) {
      thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          ownerId: task.authorId,
          applicantId: user.id,
          hasUnreadForOwner: true, // დამკვეთს აუნთოს წერტილი
          hasUnreadForApplicant: false,
        },
      });
    } else {
      // უკვე არსებობს → owner-ს წაუნთე წერტილი მაინც
      if (!thread.hasUnreadForOwner) {
        await prisma.chatThread.update({
          where: { id: thread.id },
          data: { hasUnreadForOwner: true },
        });
      }
    }

    // 6) პირველ მესიჯად თუ რამე დაწერა — შევინახოთ
    if (message) {
      await prisma.chatMessage.create({
        data: {
          threadId: thread.id,
          authorId: user.id,
          body: message,
        },
      });
      // owner unread მონიშნული უკვე გვაქვს true-ზე ზემოთ
    }

    return NextResponse.json({
      ok: true,
      application: { id: appId, status: appStatus },
      thread: { id: thread.id },
    });
  } catch (e) {
    console.error('POST /api/tasks/:id/apply error:', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
