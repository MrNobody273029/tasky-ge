import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureUserFromReq } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  return [];
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await ensureUserFromReq(req);
    if (!me) return NextResponse.json({ error: "auth_required" }, { status: 401 });

    const evidenceId = String(params?.id || "").trim();
    if (!evidenceId) return NextResponse.json({ error: "missing_evidence_id" }, { status: 400 });

    const body = (await req.json().catch(() => ({}))) as any;
    const action = String(body?.action || "").toUpperCase(); // START | RESPOND | SEEN
    const role = String(body?.role || "").toUpperCase();     // WORKER | CLIENT

    // ---- load evidence with participants ----
    const ev = await prisma.taskEvidence.findUnique({
      where: { id: evidenceId },
      select: {
        id: true,
        taskId: true,
        authorId: true, // worker
        task: { select: { authorId: true } }, // client
      },
    });
    if (!ev) return NextResponse.json({ error: "evidence_not_found" }, { status: 404 });

    const workerId = ev.authorId;
    const clientId = ev.task.authorId;

    const isWorker = me.id === workerId;
    const isClient = me.id === clientId;
    if (!isWorker && !isClient) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    // ---- helpers ----
    const text = String(body?.text || "").trim().slice(0, 4000);
    const photos = asStringArray(body?.photos).slice(0, 12);
    const videos = asStringArray(body?.videos).slice(0, 6);
    const files = asStringArray(body?.files).slice(0, 12);

    const wantRole: "WORKER" | "CLIENT" = role === "WORKER" ? "WORKER" : "CLIENT";
    const myRole: "WORKER" | "CLIENT" = isWorker ? "WORKER" : "CLIENT";
    if (wantRole !== myRole) {
      return NextResponse.json({ error: "role_mismatch" }, { status: 400 });
    }

    // ---- SEEN ----
    if (action === "SEEN") {
      const d = await prisma.dispute.findUnique({ where: { evidenceId } });
      if (!d) return NextResponse.json({ ok: true, dispute: null }, { status: 200 });

      const upd =
        isClient
          ? { clientSeen: true }
          : { workerSeen: true };

      const updated = await prisma.dispute.update({
        where: { evidenceId },
        data: upd,
      });

      return NextResponse.json({ ok: true, dispute: mapDispute(updated) }, { status: 200 });
    }

    // ---- START/RESPOND ----
    if (action !== "START" && action !== "RESPOND") {
      return NextResponse.json({ error: "invalid_action" }, { status: 400 });
    }

    // must have something
    if (!text && photos.length === 0 && videos.length === 0 && files.length === 0) {
      return NextResponse.json({ error: "empty_payload" }, { status: 400 });
    }

    const existing = await prisma.dispute.findUnique({ where: { evidenceId } });

    // ---- START (creates dispute or rejects if already exists) ----
    if (action === "START") {
      if (existing) {
        // already started -> treat as ok (idempotent-ish)
        return NextResponse.json({ ok: true, dispute: mapDispute(existing) }, { status: 200 });
      }

      const deadlineAt = new Date(Date.now() + FOUR_DAYS_MS);

      // starter is also "submitted"
      const starterData = isClient
        ? {
            clientSubmitted: true,
            clientText: text,
            clientPhotos: JSON.stringify(photos),
            clientVideos: JSON.stringify(videos),
            clientFiles: JSON.stringify(files),
            clientSeen: true,
            workerSeen: false,
            status: "WAITING_OTHER" as const,
          }
        : {
            workerSubmitted: true,
            workerText: text,
            workerPhotos: JSON.stringify(photos),
            workerVideos: JSON.stringify(videos),
            workerFiles: JSON.stringify(files),
            workerSeen: true,
            clientSeen: false,
            status: "WAITING_OTHER" as const,
          };

      const created = await prisma.dispute.create({
        data: {
          taskId: ev.taskId,
          evidenceId: ev.id,
          clientId,
          workerId,
          deadlineAt,
          ...starterData,
        },
      });

      return NextResponse.json({ ok: true, dispute: mapDispute(created) }, { status: 201 });
    }

    // ---- RESPOND ----
    if (!existing) {
      return NextResponse.json({ error: "dispute_not_started" }, { status: 409 });
    }

    // lock if resolved/cancelled/sent
    if (existing.status === "RESOLVED" || existing.status === "CANCELLED" || existing.status === "SENT") {
      return NextResponse.json({ error: "locked" }, { status: 409 });
    }

    // allow only once per side
    if (isClient && existing.clientSubmitted) return NextResponse.json({ error: "already_submitted" }, { status: 409 });
    if (isWorker && existing.workerSubmitted) return NextResponse.json({ error: "already_submitted" }, { status: 409 });

    // deadline check
    if (existing.deadlineAt && new Date(existing.deadlineAt).getTime() < Date.now()) {
      return NextResponse.json({ error: "deadline_passed" }, { status: 409 });
    }

    const patch = isClient
      ? {
          clientSubmitted: true,
          clientText: text,
          clientPhotos: JSON.stringify(photos),
          clientVideos: JSON.stringify(videos),
          clientFiles: JSON.stringify(files),
          clientSeen: true,
          workerSeen: false,
        }
      : {
          workerSubmitted: true,
          workerText: text,
          workerPhotos: JSON.stringify(photos),
          workerVideos: JSON.stringify(videos),
          workerFiles: JSON.stringify(files),
          workerSeen: true,
          clientSeen: false,
        };

    const willBoth = (isClient ? true : existing.clientSubmitted) && (isWorker ? true : existing.workerSubmitted);

    const updated = await prisma.dispute.update({
      where: { evidenceId },
      data: {
        ...patch,
        status: willBoth ? "SENT" : "WAITING_OTHER",
      },
    });

    return NextResponse.json({ ok: true, dispute: mapDispute(updated) }, { status: 200 });
  } catch (e) {
    console.error("POST /api/evidences/[id]/dispute error", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

function mapDispute(d: any) {
  // Return shape that your Front expects (DisputeInfo)
  // status: NONE|STARTED|WAITING_OTHER|BOTH_SUBMITTED|SENT|RESOLVED
  const status =
    d.status === "RESOLVED"
      ? "RESOLVED"
      : d.status === "SENT"
        ? "SENT"
        : d.status === "WAITING_OTHER" || d.status === "OPEN"
          ? "WAITING_OTHER"
          : d.status === "BOTH_SUBMITTED"
            ? "BOTH_SUBMITTED"
            : "STARTED";

  return {
    status,
    startedAt: d.startedAt ? new Date(d.startedAt).toISOString() : null,
    deadlineAt: d.deadlineAt ? new Date(d.deadlineAt).toISOString() : null,
    resultText: d.resultText || null,
    resolvedAt: d.resolvedAt ? new Date(d.resolvedAt).toISOString() : null,
    clientSeen: Boolean(d.clientSeen),
    workerSeen: Boolean(d.workerSeen),
    clientSubmitted: Boolean(d.clientSubmitted),
    workerSubmitted: Boolean(d.workerSubmitted),
  };
}
