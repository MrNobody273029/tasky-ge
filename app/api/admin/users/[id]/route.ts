// app/api/admin/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureUserFromReq } from "@/lib/auth";
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type TaskCardPayload = {
  id: string;
  title: string;
  desc: string | null;
  category: string | null;
  skill: string | null;
  reward: number;
  deadline: string | null;
  where: "REMOTE" | "ONSITE";
  exclusive: boolean;
  status: string;
  locale: "ka" | "en";
  createdAt: string;
};

type TakenFlag = "pending" | "rejected" | "approved" | null;

type TakenItemPayload = {
  task: TaskCardPayload;
  flag: TakenFlag;
  createdAt: string; // claim/app.createdAt
};

function taskToCardPayload(task: any): TaskCardPayload {
  return {
    id: task.id,
    title: task.title,
    desc: task.desc ?? null,
    category: task.category ?? null,
    skill: task.skill ?? null,
    reward: Number(task.reward) || 0,
    deadline: task.deadline ? task.deadline.toISOString() : null,
    where: task.where === "ONSITE" ? "ONSITE" : "REMOTE",
    exclusive: !!task.exclusive,
    status: task.status,
    locale: task.locale === "en" ? "en" : "ka",
    createdAt: task.createdAt.toISOString(),
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
try {
  const me = await ensureUserFromReq(req);

  // isAdmin-ს any-ით ამოვიღებთ, რომ ტიპზე არ იწუწუნოს
  const isAdmin = (me as any)?.isAdmin === true;

  if (!me || !isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

    const id = (params.id || "").trim();
    if (!id) {
      return NextResponse.json({ error: "missing_id" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image: true,
        createdAt: true,
        commissionPct: true,
        ratingWorkerAvg: true,
        ratingWorkerCount: true,
        ratingClientAvg: true,
        ratingClientCount: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const [
      tasksPosted,
      tasksTaken,
      evidApproved,
      evidRejected,
      walletTxs,
      createdTasksDb,
      claims,
      apps,
    ] = await Promise.all([
      prisma.task.count({ where: { authorId: id } }),
      prisma.taskClaim.count({ where: { userId: id } }),
      prisma.taskEvidence.count({
        where: { authorId: id, status: "APPROVED" },
      }),
      prisma.taskEvidence.count({
        where: { authorId: id, status: "REJECTED" },
      }),
      prisma.walletTransaction.findMany({
        where: {
          userId: id,
          status: "COMPLETED",
          method: { not: "card" },
        },
        select: { amount: true },
      }),
      prisma.task.findMany({
        where: { authorId: id },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.taskClaim.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        include: { task: true },
      }),
      prisma.taskApplication.findMany({
        where: {
          applicantId: id,
          status: { in: ["PENDING", "REJECTED"] },
          task: { exclusive: true },
        },
        orderBy: { createdAt: "desc" },
        include: { task: true },
      }),
    ]);

    let earnedTotal = 0;
    let spentTotal = 0;
    for (const t of walletTxs) {
      if (t.amount > 0) earnedTotal += t.amount;
      if (t.amount < 0) spentTotal += -t.amount;
    }

    // ---- createdTasks (ბოლო 10, ნებისმიერი სტატუსი) ----
    const createdTasks: TaskCardPayload[] = createdTasksDb.map((t) =>
      taskToCardPayload(t)
    );

    // ---- takenItems: claims + exclusive applications ----
    const takenFromClaims: TakenItemPayload[] = claims
      .filter((c) => c.task)
      .map((c) => {
        const taskPayload = taskToCardPayload(c.task as any);
        const isExclusive = !!(c.task as any).exclusive;
        const flag: TakenFlag = isExclusive ? "approved" : null;
        return {
          task: taskPayload,
          flag,
          createdAt: c.createdAt.toISOString(),
        };
      });

    const claimedIds = new Set(takenFromClaims.map((i) => i.task.id));

    const takenFromApps: TakenItemPayload[] = apps
      .filter((a) => a.task && !claimedIds.has(a.taskId))
      .map((a) => {
        const taskPayload = taskToCardPayload(a.task as any);
        const flag: TakenFlag =
          a.status === "PENDING" ? "pending" : "rejected";
        return {
          task: taskPayload,
          flag,
          createdAt: a.createdAt.toISOString(),
        };
      });

    const takenItems: TakenItemPayload[] = [...takenFromApps, ...takenFromClaims].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const payload = {
      user: {
        ...user,
        createdAt: user.createdAt.toISOString(),
      },
      stats: {
        tasksPosted,
        tasksTaken,
        completedTasks: evidApproved,
        failedTasks: evidRejected,
        earnedTotal,
        spentTotal,
      },
      createdTasks,
      takenItems,
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (e) {
    console.error("GET /api/admin/users/[id] error", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

// PATCH – მხოლოდ საკომისიოს შეცვლა (როგორც გაქვს)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const me = await ensureUserFromReq(req);
    if (!me || !me.isAdmin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const id = (params.id || "").trim();
    if (!id) {
      return NextResponse.json({ error: "missing_id" }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      commissionPct?: number;
    };

    let pct = Number(body.commissionPct);
    if (!Number.isFinite(pct)) {
      return NextResponse.json({ error: "invalid_pct" }, { status: 400 });
    }

    pct = Math.round(pct);
    if (pct < 0 || pct > 100) {
      return NextResponse.json(
        { error: "pct_out_of_range" },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { commissionPct: pct },
      select: { id: true, commissionPct: true },
    });

    return NextResponse.json(
      { ok: true, commissionPct: updated.commissionPct },
      { status: 200 }
    );
  } catch (e) {
    console.error("PATCH /api/admin/users/[id] error", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
