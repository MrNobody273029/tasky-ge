// app/api/admin/analytics/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureUserFromReq } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Group = "day" | "week" | "month";

function clampRange(from: Date, to: Date) {
  const ms = to.getTime() - from.getTime();
  const maxDays = 370; // safety
  const maxMs = maxDays * 24 * 60 * 60 * 1000;
  if (ms > maxMs) {
    const nextTo = new Date(from.getTime() + maxMs);
    return { from, to: nextTo };
  }
  return { from, to };
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function keyFor(d: Date, group: Group) {
  const x = new Date(d);
  if (group === "day") return ymd(x);

  if (group === "week") {
    // ISO-ish week bucket by Monday start (simple)
    const day = (x.getDay() + 6) % 7; // Mon=0..Sun=6
    const monday = startOfDay(addDays(x, -day));
    return `W:${ymd(monday)}`;
  }

  // month
  return `M:${x.getFullYear()}-${pad2(x.getMonth() + 1)}`;
}

function labelForBucketKey(k: string, group: Group) {
  if (group === "day") return k;
  if (group === "week") return k.replace("W:", "Week of ");
  return k.replace("M:", "");
}

function safeNumber(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(req: NextRequest) {
  try {
    const me = await ensureUserFromReq(req);
    if (!me || !(me as any).isAdmin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const group = (url.searchParams.get("group") || "day") as Group;

    const now = new Date();

    const fromRaw = url.searchParams.get("from");
    const toRaw = url.searchParams.get("to");

    // default: last 30 days
    const from = fromRaw ? new Date(fromRaw) : addDays(now, -30);
    const to = toRaw ? new Date(toRaw) : now;

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return NextResponse.json({ error: "invalid_range" }, { status: 400 });
    }

    const fromDay = startOfDay(from);
    const toDay = startOfDay(to);
    const { from: f, to: t } = clampRange(fromDay, toDay);

    // We use [f, t+1day) for inclusive days
    const tExclusive = addDays(t, 1);

    // --- Pull minimal rows for JS aggregation ---
    // Tasks created in range
    const tasks = await prisma.task.findMany({
      where: { createdAt: { gte: f, lt: tExclusive } },
      select: {
        createdAt: true,
        status: true,
        exclusive: true,
        where: true,
        category: true,
        reward: true,
        authorId: true,
      },
    });

    // Claims in range (taken flow, non-exclusive usually)
    const claims = await prisma.taskClaim.findMany({
      where: { createdAt: { gte: f, lt: tExclusive } },
      select: { createdAt: true, userId: true, taskId: true },
    });

    // Applications in range (exclusive flow)
    const apps = await prisma.taskApplication.findMany({
      where: { createdAt: { gte: f, lt: tExclusive } },
      select: { createdAt: true, status: true, taskId: true, applicantId: true },
    });

    // Evidence in range
    const evidences = await prisma.taskEvidence.findMany({
      where: { createdAt: { gte: f, lt: tExclusive } },
      select: {
        createdAt: true,
        status: true,
        autoApproved: true,
        authorId: true,
        taskId: true,
      },
    });

    // Wallet tx in range (platform money view)
    const txs = await prisma.walletTransaction.findMany({
      where: { createdAt: { gte: f, lt: tExclusive } },
      select: {
        createdAt: true,
        type: true,
        status: true,
        amount: true,
        method: true,
        userId: true,
        taskId: true,
      },
    });

    // Users new signups in range
    const newUsers = await prisma.user.count({
      where: { createdAt: { gte: f, lt: tExclusive }, isAdmin: false },
    });

    // --- KPI aggregation ---
    let tasksTotal = tasks.length;
    let tasksPublished = 0;
    let tasksDraft = 0;
    let tasksExclusive = 0;
    let tasksMulti = 0;

    let remote = 0;
    let onsite = 0;

    const categoryMap: Record<string, number> = {};
    const tasksByAuthor: Record<string, number> = {};
    let rewardSum = 0;

    for (const x of tasks) {
      if (x.status === "PUBLISHED") tasksPublished++;
      else tasksDraft++;

      if (x.exclusive) tasksExclusive++;
      else tasksMulti++;

      if (x.where === "ONSITE") onsite++;
      else remote++;

      const cat = String(x.category || "—").trim() || "—";
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;

      const aid = String(x.authorId || "");
      if (aid) tasksByAuthor[aid] = (tasksByAuthor[aid] || 0) + 1;

      rewardSum += safeNumber(x.reward);
    }

    const claimsTotal = claims.length;

    let appsPending = 0;
    let appsApproved = 0;
    let appsRejected = 0;
    for (const a of apps) {
      if (a.status === "PENDING") appsPending++;
      else if (a.status === "APPROVED") appsApproved++;
      else if (a.status === "REJECTED") appsRejected++;
    }

    let evPending = 0;
    let evApproved = 0;
    let evRejected = 0;
    let evNeedsFixes = 0;
    let evExpired = 0;
    let evAutoApproved = 0;

    for (const e of evidences) {
      if (e.status === "PENDING") evPending++;
      else if (e.status === "APPROVED") evApproved++;
      else if (e.status === "REJECTED") evRejected++;
      else if (e.status === "NEEDS_FIXES") evNeedsFixes++;
      else if (e.status === "EXPIRED") evExpired++;

      if (e.autoApproved) evAutoApproved++;
    }

    // Wallet: platform revenue = PUBLISH_FEE negative sums (abs)
    let publishFeesCollected = 0; // positive number in UI
    let workerEarningsPaid = 0;
    let withdrawalsTotal = 0;
    let netInternalDelta = 0;

    for (const tx of txs) {
      if (tx.status !== "COMPLETED") continue;

      // internal money excludes card
      const isInternal = tx.method !== "card";
      if (isInternal) netInternalDelta += safeNumber(tx.amount);

      if (tx.type === "PUBLISH_FEE") {
        // stored negative
        if (tx.amount < 0) publishFeesCollected += Math.abs(tx.amount);
      }
      if (tx.type === "EARNING") {
        if (tx.amount > 0) workerEarningsPaid += tx.amount;
      }
      if (tx.type === "WITHDRAWAL") {
        // stored negative
        if (tx.amount < 0) withdrawalsTotal += Math.abs(tx.amount);
      }
    }

    const avgReward = tasksTotal > 0 ? Math.round(rewardSum / tasksTotal) : 0;

    // --- Time series ---
    // initialize empty buckets
    const buckets: Record<
      string,
      {
        label: string;
        tasks: number;
        published: number;
        draft: number;
        claims: number;
        appsPending: number;
        appsApproved: number;
        appsRejected: number;
        evPending: number;
        evApproved: number;
        evRejected: number;
        evNeedsFixes: number;
        evExpired: number;
        publishFees: number;
        earnings: number;
        withdrawals: number;
      }
    > = {};

    function ensureBucket(d: Date) {
      const k = keyFor(d, group);
      if (!buckets[k]) {
        buckets[k] = {
          label: labelForBucketKey(k, group),
          tasks: 0,
          published: 0,
          draft: 0,
          claims: 0,
          appsPending: 0,
          appsApproved: 0,
          appsRejected: 0,
          evPending: 0,
          evApproved: 0,
          evRejected: 0,
          evNeedsFixes: 0,
          evExpired: 0,
          publishFees: 0,
          earnings: 0,
          withdrawals: 0,
        };
      }
      return buckets[k];
    }

    for (const x of tasks) {
      const b = ensureBucket(x.createdAt);
      b.tasks++;
      if (x.status === "PUBLISHED") b.published++;
      else b.draft++;
    }

    for (const c of claims) {
      ensureBucket(c.createdAt).claims++;
    }

    for (const a of apps) {
      const b = ensureBucket(a.createdAt);
      if (a.status === "PENDING") b.appsPending++;
      else if (a.status === "APPROVED") b.appsApproved++;
      else if (a.status === "REJECTED") b.appsRejected++;
    }

    for (const e of evidences) {
      const b = ensureBucket(e.createdAt);
      if (e.status === "PENDING") b.evPending++;
      else if (e.status === "APPROVED") b.evApproved++;
      else if (e.status === "REJECTED") b.evRejected++;
      else if (e.status === "NEEDS_FIXES") b.evNeedsFixes++;
      else if (e.status === "EXPIRED") b.evExpired++;
    }

    for (const tx of txs) {
      if (tx.status !== "COMPLETED") continue;
      const b = ensureBucket(tx.createdAt);

      if (tx.type === "PUBLISH_FEE" && tx.amount < 0) b.publishFees += Math.abs(tx.amount);
      if (tx.type === "EARNING" && tx.amount > 0) b.earnings += tx.amount;
      if (tx.type === "WITHDRAWAL" && tx.amount < 0) b.withdrawals += Math.abs(tx.amount);
    }

    const series = Object.entries(buckets)
      .sort((a, b) => (a[0] > b[0] ? 1 : -1))
      .map(([, v]) => v);

    // --- Top lists ---
    // top categories
    const categories = Object.entries(categoryMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);

    // top authors by tasks posted (need user info)
    const topAuthorPairs = Object.entries(tasksByAuthor)
      .map(([userId, value]) => ({ userId, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const topAuthorIds = topAuthorPairs.map((x) => x.userId);
    const topUsers = topAuthorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: topAuthorIds } },
          select: { id: true, name: true, email: true, image: true },
        })
      : [];

    const userMap = new Map(topUsers.map((u) => [u.id, u]));
    const topAuthors = topAuthorPairs.map((p) => {
      const u = userMap.get(p.userId);
      const label = u?.name || (u?.email ? u.email.split("@")[0] : p.userId.slice(0, 8));
      return { id: p.userId, label, value: p.value };
    });

    return NextResponse.json(
      {
        range: { from: f.toISOString(), to: t.toISOString(), group },
        kpis: {
          newUsers,
          tasksTotal,
          tasksPublished,
          tasksDraft,
          tasksExclusive,
          tasksMulti,
          claimsTotal,
          appsPending,
          appsApproved,
          appsRejected,
          evidences: {
            pending: evPending,
            approved: evApproved,
            rejected: evRejected,
            needsFixes: evNeedsFixes,
            expired: evExpired,
            autoApproved: evAutoApproved,
          },
          location: { remote, onsite },
          avgReward,
          wallet: {
            publishFeesCollected,
            workerEarningsPaid,
            withdrawalsTotal,
            netInternalDelta,
          },
        },
        series,
        pies: {
          categories,
          location: [
            { name: "REMOTE", value: remote },
            { name: "ONSITE", value: onsite },
          ],
          taskType: [
            { name: "EXCLUSIVE", value: tasksExclusive },
            { name: "MULTI", value: tasksMulti },
          ],
        },
        top: {
          authorsByTasksPosted: topAuthors,
        },
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("GET /api/admin/analytics error", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
