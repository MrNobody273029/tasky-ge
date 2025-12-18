// app/api/evidences/[id]/dispute/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureUserFromReq } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return [];
    // allow JSON stringified arrays
    if (s.startsWith("[") && s.endsWith("]")) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed.map(String).map((x) => x.trim()).filter(Boolean);
      } catch {}
    }
  }
  return [];
}

function isLocked(status: string) {
  return status === "RESOLVED" || status === "CANCELLED" || status === "SENT";
}

/** map for lightweight UI badge/info */
function mapDisputeInfo(d: any) {
  const status =
    d.status === "RESOLVED"
      ? "RESOLVED"
      : d.status === "SENT"
        ? "SENT"
        : d.status === "BOTH_SUBMITTED"
          ? "BOTH_SUBMITTED"
          : d.status === "WAITING_OTHER" || d.status === "OPEN"
            ? "WAITING_OTHER"
            : "STARTED";

  return {
    id: d.id,
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

function parseJsonArr(str: string) {
  try {
    const a = JSON.parse(str || "[]");
    return Array.isArray(a) ? a.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

/** full details (attachments/text) with anti-peek */
function mapDisputeDetails(d: any, viewerRole: "CLIENT" | "WORKER", isAdmin: boolean) {
  const info = mapDisputeInfo(d);

  const clientCanReveal = isAdmin || d.clientSubmitted;
  const workerCanReveal = isAdmin || d.workerSubmitted;

  const viewerSubmitted = viewerRole === "CLIENT" ? d.clientSubmitted : d.workerSubmitted;
  const allowOtherSide = isAdmin || viewerSubmitted; // anti-peek: you see other only after you submit

  return {
    ...info,

    client: clientCanReveal
      ? {
          submitted: Boolean(d.clientSubmitted),
          text: d.clientText || "",
          photos: parseJsonArr(d.clientPhotos),
          videos: parseJsonArr(d.clientVideos),
          files: parseJsonArr(d.clientFiles),
        }
      : { submitted: false, text: "", photos: [], videos: [], files: [] },

    worker: workerCanReveal
      ? {
          submitted: Boolean(d.workerSubmitted),
          text: d.workerText || "",
          photos: parseJsonArr(d.workerPhotos),
          videos: parseJsonArr(d.workerVideos),
          files: parseJsonArr(d.workerFiles),
        }
      : { submitted: false, text: "", photos: [], videos: [], files: [] },

    // If viewer hasn't submitted yet, hide other side content
    hideOtherSide: !allowOtherSide,
  };
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await ensureUserFromReq(req);
    if (!me) return NextResponse.json({ error: "auth_required" }, { status: 401 });

    const evidenceId = String(params?.id || "").trim();
    if (!evidenceId) return NextResponse.json({ error: "missing_evidence_id" }, { status: 400 });

    const ev = await prisma.taskEvidence.findUnique({
      where: { id: evidenceId },
      select: { id: true, authorId: true, task: { select: { authorId: true } } },
    });
    if (!ev) return NextResponse.json({ error: "evidence_not_found" }, { status: 404 });

    const workerId = ev.authorId;
    const clientId = ev.task.authorId;

    const isWorker = me.id === workerId;
    const isClient = me.id === clientId;

    const isAdmin = Boolean((me as any).isAdmin); // ensureUserFromReq should return isAdmin
    if (!isAdmin && !isWorker && !isClient) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const d = await prisma.dispute.findUnique({ where: { evidenceId } });
    if (!d) return NextResponse.json({ ok: true, dispute: null }, { status: 200 });

    const role: "CLIENT" | "WORKER" = isClient ? "CLIENT" : "WORKER";
    const details = mapDisputeDetails(d, role, isAdmin);

    // anti-peek enforcement: hide other side content if needed
    if (details.hideOtherSide && !isAdmin) {
      if (role === "CLIENT") {
        details.worker = { submitted: Boolean(d.workerSubmitted), text: "", photos: [], videos: [], files: [] };
      } else {
        details.client = { submitted: Boolean(d.clientSubmitted), text: "", photos: [], videos: [], files: [] };
      }
    }

    return NextResponse.json({ ok: true, dispute: details }, { status: 200 });
  } catch (e) {
    console.error("GET /api/evidences/[id]/dispute error", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
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

    const wantRole: "WORKER" | "CLIENT" = role === "WORKER" ? "WORKER" : "CLIENT";
    const myRole: "WORKER" | "CLIENT" = isWorker ? "WORKER" : "CLIENT";
    if (wantRole !== myRole) return NextResponse.json({ error: "role_mismatch" }, { status: 400 });

    // payload
    const text = String(body?.text || "").trim().slice(0, 4000);
    const photos = asStringArray(body?.photos).slice(0, 12);
    const videos = asStringArray(body?.videos).slice(0, 6);
    const files = asStringArray(body?.files).slice(0, 12);

    // SEEN
    if (action === "SEEN") {
      const d = await prisma.dispute.findUnique({ where: { evidenceId } });
      if (!d) return NextResponse.json({ ok: true, dispute: null }, { status: 200 });

      const upd = isClient ? { clientSeen: true } : { workerSeen: true };
      const updated = await prisma.dispute.update({ where: { evidenceId }, data: upd });

      return NextResponse.json({ ok: true, dispute: mapDisputeInfo(updated) }, { status: 200 });
    }

    if (action !== "START" && action !== "RESPOND") {
      return NextResponse.json({ error: "invalid_action" }, { status: 400 });
    }

    if (!text && photos.length === 0 && videos.length === 0 && files.length === 0) {
      return NextResponse.json({ error: "empty_payload" }, { status: 400 });
    }

    const existing = await prisma.dispute.findUnique({ where: { evidenceId } });

    // START
    if (action === "START") {
      if (existing) {
        return NextResponse.json({ ok: true, dispute: mapDisputeInfo(existing) }, { status: 200 });
      }

      const deadlineAt = new Date(Date.now() + FOUR_DAYS_MS);

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

      return NextResponse.json({ ok: true, dispute: mapDisputeInfo(created) }, { status: 201 });
    }

    // RESPOND
    if (!existing) return NextResponse.json({ error: "dispute_not_started" }, { status: 409 });
    if (isLocked(existing.status)) return NextResponse.json({ error: "locked" }, { status: 409 });

    if (isClient && existing.clientSubmitted) return NextResponse.json({ error: "already_submitted" }, { status: 409 });
    if (isWorker && existing.workerSubmitted) return NextResponse.json({ error: "already_submitted" }, { status: 409 });

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

    const willBoth =
      (isClient ? true : Boolean(existing.clientSubmitted)) &&
      (isWorker ? true : Boolean(existing.workerSubmitted));

    const updated = await prisma.dispute.update({
      where: { evidenceId },
      data: {
        ...patch,
        status: willBoth ? ("BOTH_SUBMITTED" as const) : ("WAITING_OTHER" as const),
      },
    });

    return NextResponse.json({ ok: true, dispute: mapDisputeInfo(updated) }, { status: 200 });
  } catch (e) {
    console.error("POST /api/evidences/[id]/dispute error", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
