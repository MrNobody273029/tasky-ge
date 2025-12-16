// app/api/tasks/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureUserFromReq } from '@/lib/auth';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

/* -------------------- helpers -------------------- */
function mapStatus(v: 'draft' | 'published' | undefined) {
  return v === 'published' ? 'PUBLISHED' : 'DRAFT';
}
function mapWhere(v: 'remote' | 'onsite' | undefined) {
  return v === 'onsite' ? 'ONSITE' : v === 'remote' ? 'REMOTE' : undefined;
}

/** viewerId: ჯერ cookie x-user-id, მერე (თუ არაა) email→id ფოლბექი */
async function resolveViewerId(req: Request): Promise<string | null> {
  const uidCookie = cookies().get('x-user-id')?.value?.trim();
  if (uidCookie) return uidCookie;

  const raw = req.headers.get('cookie') || '';
  const m = raw.match(/(?:^|;\s*)email=([^;]+)/);
  if (m) {
    const em = decodeURIComponent(m[1]).toLowerCase();
    const u = await prisma.user.findUnique({
      where: { email: em },
      select: { id: true },
    });
    if (u?.id) return u.id;
  }
  return null;
}

/**
 * Deadline rules:
 * - allow null
 * - valid Date
 * - must be >= start of tomorrow (server-local)
 */
function startOfTomorrow(): Date {
  const now = new Date();
  const t = new Date(now);
  t.setHours(0, 0, 0, 0);
  t.setDate(t.getDate() + 1);
  return t;
}

function isExpiredServer(deadline: Date | null): boolean {
  if (!deadline) return false;
  return deadline.getTime() < Date.now();
}

/* -------------------- GET /api/tasks/:id -------------------- */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const viewerId = await resolveViewerId(req);

    const task = await prisma.task.findUnique({ where: { id: params.id } });
    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // UI-სთვის საჭირო derived ველები DB-დან (თუ viewer ცნობილია)
    let hasTakenByMe = false as boolean;
    let myAppStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED' = 'NONE';
    let myThreadId: string | null = null;

    if (viewerId) {
      const [claim, app, thread] = await Promise.all([
        prisma.taskClaim
          .findUnique({
            where: { taskId_userId: { taskId: params.id, userId: viewerId } },
            select: { id: true },
          })
          .catch(() => null),

        prisma.taskApplication
          .findUnique({
            where: {
              taskId_applicantId: { taskId: params.id, applicantId: viewerId },
            },
            select: { status: true },
          })
          .catch(() => null),

        prisma.chatThread
          .findUnique({
            where: {
              taskId_applicantId: { taskId: params.id, applicantId: viewerId },
            },
            select: { id: true },
          })
          .catch(() => null),
      ]);

      if (app?.status) myAppStatus = app.status as any;
      if (thread?.id) myThreadId = thread.id;

      // აღებულად ჩავთვალოთ თუ არსებობს claim ან აპლიკაცია დამტკიცებულია
      hasTakenByMe = Boolean(claim) || myAppStatus === 'APPROVED';
    }

    // DB-ში photos ინახება JSON string-ად → ვპარსავთ
    let photos: string[] = [];
    try {
      photos = JSON.parse(task.photos ?? '[]') as string[];
    } catch {
      photos = [];
    }

    const isMine =
      !!viewerId &&
      (task.authorId || '').toLowerCase() === viewerId.toLowerCase();

    const isExpired = isExpiredServer(task.deadline);

    return NextResponse.json({
      id: task.id,
      authorId: task.authorId,
      isMine,

      hasTakenByMe,
      myAppStatus,
      myThreadId,

      // ✅ server-side expired flag (authoritative)
      isExpired,

      locale: task.locale,
      title: task.title,
      desc: task.desc,
      category: task.category,
      skill: task.skill,
      reward: task.reward,
      deadline: task.deadline ? task.deadline.toISOString() : null,
      where: task.where,
      address: task.address ?? null,
      exclusive: task.exclusive,
      status: task.status,
      photos,
      proof: task.proof ?? '',
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    });
  } catch (e) {
    console.error('GET /api/tasks/[id] error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/* -------------------- PUT /api/tasks/:id -------------------- */
/** მხოლოდ ავტორს შეუძლია დრაფტის განახლება/გამოქვეყნება. */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await ensureUserFromReq(req); // 🔒 auth + user row
    if (!user) {
      return NextResponse.json({ error: 'auth_required' }, { status: 401 });
    }

    const id = params.id;

    // ✅ update-მდე ვიგებთ task-ის locale-ს (100% სწორი revalidate-ისთვის)
    const existing = await prisma.task.findFirst({
      where: { id, authorId: user.id },
      select: { locale: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'not_found_or_forbidden' }, { status: 404 });
    }

    const body = (await req.json().catch(() => ({}))) as any;

    const updates: Record<string, any> = {};

    if (body.locale) updates.locale = String(body.locale);
    if (body.title) updates.title = String(body.title).trim();
    if (body.desc) updates.desc = String(body.desc).trim();
    if (body.category) updates.category = String(body.category).trim();
    if (body.skill) updates.skill = String(body.skill).trim();

    if (body.reward !== undefined) {
      const r = Number(body.reward);
      if (!Number.isFinite(r) || r < 0) {
        return NextResponse.json({ error: 'invalid_reward' }, { status: 400 });
      }
      updates.reward = Math.round(r);
    }

    if (body.deadline !== undefined) {
      if (!body.deadline) {
        updates.deadline = null;
      } else {
        const d = new Date(body.deadline);
        if (Number.isNaN(d.getTime())) {
          return NextResponse.json({ error: 'invalid_deadline' }, { status: 400 });
        }
        // ✅ must be tomorrow or later (server-local)
        if (d.getTime() < startOfTomorrow().getTime()) {
          return NextResponse.json({ error: 'deadline_too_soon' }, { status: 400 });
        }
        updates.deadline = d;
      }
    }

    if (body.exclusive !== undefined) updates.exclusive = !!body.exclusive;
    if (body.status) updates.status = mapStatus(body.status);
    if (body.proof !== undefined) updates.proof = String(body.proof ?? '');

    if (body.where !== undefined) {
      const w = mapWhere(body.where);
      if (w) updates.where = w;

      if (w === 'REMOTE') {
        updates.address = null;
      } else if (w === 'ONSITE' && body.address !== undefined) {
        updates.address = body.address ?? null;
      }
    } else if (body.address !== undefined) {
      updates.address = body.address ?? null;
    }

    // photos — მოსალოდნელია ან string(JSON), ან string[]
    if (body.photos !== undefined) {
      if (Array.isArray(body.photos)) {
        updates.photos = JSON.stringify(
          (body.photos as any[])
            .map((s: any) => String(s))
            .map((s: string) => s.trim())
            .filter(Boolean)
            .filter((s: string) => /^https?:\/\/\S+/i.test(s))
            .slice(0, 20),
        );
      } else if (typeof body.photos === 'string') {
        updates.photos = body.photos;
      } else if (body.photos === null) {
        updates.photos = '[]';
      }
    }

    await prisma.task.updateMany({
      where: { id, authorId: user.id },
      data: updates,
    });

    const pageLocale =
      updates.locale === 'en'
        ? 'en'
        : updates.locale === 'ka'
          ? 'ka'
          : existing.locale === 'en'
            ? 'en'
            : 'ka';

    revalidatePath(`/${pageLocale}/mypage/created`);
    revalidatePath(`/${pageLocale}`);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error('PUT /api/tasks/[id] error:', e);
    return NextResponse.json({ error: 'update_failed' }, { status: 400 });
  }
}

/* -------------------- PATCH /api/tasks/:id -------------------- */
/** მხოლოდ ავტორს შეუძლია deadline-ის გახანგრძლივება (მინიმუმ ხვალ). */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await ensureUserFromReq(req);
    if (!user) {
      return NextResponse.json({ error: 'auth_required' }, { status: 401 });
    }

    const id = (params?.id || '').trim();
    if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

    const task = await prisma.task.findFirst({
      where: { id, authorId: user.id },
      select: { id: true, locale: true, deadline: true },
    });
    if (!task) {
      return NextResponse.json({ error: 'not_found_or_forbidden' }, { status: 404 });
    }

    const body = (await req.json().catch(() => ({}))) as any;

    if (body.deadline === undefined) {
      return NextResponse.json({ error: 'missing_deadline' }, { status: 400 });
    }

    let nextDeadline: Date | null = null;

    if (!body.deadline) {
      nextDeadline = null;
    } else {
      const d = new Date(body.deadline);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: 'invalid_deadline' }, { status: 400 });
      }
      if (d.getTime() < startOfTomorrow().getTime()) {
        return NextResponse.json({ error: 'deadline_too_soon' }, { status: 400 });
      }
      nextDeadline = d;
    }

    const updated = await prisma.task.update({
      where: { id: task.id },
      data: { deadline: nextDeadline },
      select: { id: true, deadline: true, locale: true },
    });

    const pageLocale = updated.locale === 'en' ? 'en' : 'ka';

    revalidatePath(`/${pageLocale}/tasky`);
    revalidatePath(`/${pageLocale}/mypage/created`);
    revalidatePath(`/${pageLocale}`);

    return NextResponse.json(
      {
        ok: true,
        deadline: updated.deadline ? updated.deadline.toISOString() : null,
        isExpired: isExpiredServer(updated.deadline),
      },
      { status: 200 },
    );
  } catch (e) {
    console.error('PATCH /api/tasks/[id] error:', e);
    return NextResponse.json({ error: 'update_failed' }, { status: 400 });
  }
}

/* -------------------- DELETE /api/tasks/:id -------------------- */
/**
 * Hard delete task by author.
 * Safety:
 * - block delete if there is any evidence (PENDING/NEEDS_FIXES/APPROVED)
 * - block delete if there is any APPROVED application (exclusive winner)
 * - block delete if there are PENDING applications (exclusive ongoing)
 * - block delete if there are claims (non-exclusive taken)
 * Refund:
 * - if there is a PUBLISH_FEE tx for this task (negative amount), create a one-time refund tx (positive).
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await ensureUserFromReq(req);
    if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

    const id = (params?.id || '').trim();
    if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

    const task = await prisma.task.findFirst({
      where: { id, authorId: user.id },
      select: { id: true, title: true, locale: true, exclusive: true },
    });
    if (!task) return NextResponse.json({ error: 'not_found_or_forbidden' }, { status: 404 });

    // block if ongoing evidence exists
    const hasBlockingEvidence = await prisma.taskEvidence.findFirst({
      where: {
        taskId: task.id,
        status: { in: ['PENDING', 'NEEDS_FIXES', 'APPROVED'] },
      },
      select: { id: true },
    });
    if (hasBlockingEvidence) {
      return NextResponse.json({ error: 'cannot_delete_with_evidence' }, { status: 409 });
    }

    // ✅ block if applications are in-progress on exclusive tasks (pending or approved)
    if (task.exclusive) {
      const blockingApp = await prisma.taskApplication.findFirst({
        where: {
          taskId: task.id,
          status: { in: ['PENDING', 'APPROVED'] },
        },
        select: { id: true },
      });
      if (blockingApp) {
        return NextResponse.json({ error: 'cannot_delete_with_applications' }, { status: 409 });
      }
    }

    // block if claims exist
    const hasClaim = await prisma.taskClaim.findFirst({
      where: { taskId: task.id },
      select: { id: true },
    });
    if (hasClaim) {
      return NextResponse.json({ error: 'cannot_delete_taken_task' }, { status: 409 });
    }

    // refund publish fee if exists (idempotent)
    await prisma.$transaction(async (tx) => {
      const fee = await tx.walletTransaction.findFirst({
        where: { userId: user.id, taskId: task.id, type: 'PUBLISH_FEE' },
        orderBy: { createdAt: 'desc' },
        select: { id: true, amount: true },
      });

      if (fee && Number(fee.amount) < 0) {
        const refundAmount = Math.abs(Number(fee.amount));

        const alreadyRefunded = await tx.walletTransaction.findFirst({
          where: {
            userId: user.id,
            taskId: task.id,
            amount: refundAmount,
            type: 'OTHER',
            description: { startsWith: 'Refund: publish fee' },
          },
          select: { id: true },
        });

        if (!alreadyRefunded) {
          await tx.walletTransaction.create({
            data: {
              userId: user.id,
              taskId: task.id,
              type: 'OTHER',
              status: 'COMPLETED',
              amount: refundAmount,
              method: 'balance',
              description: `Refund: publish fee for task ${task.title}`.slice(0, 190),
            },
          });
        }
      }

      // finally delete task (cascade will clean relations)
      await tx.task.delete({ where: { id: task.id } });
    });

    const pageLocale = task.locale === 'en' ? 'en' : 'ka';
    revalidatePath(`/${pageLocale}/mypage/created`);
    revalidatePath(`/${pageLocale}/tasky`);
    revalidatePath(`/${pageLocale}`);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error('DELETE /api/tasks/[id] error:', e);
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }
}
