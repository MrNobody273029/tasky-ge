import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureUserFromReq } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const me = await ensureUserFromReq(req);
    if (!me || !(me as any).isAdmin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const status = (url.searchParams.get("status") || "").toUpperCase();
    const takeRaw = Number(url.searchParams.get("take") || "50");
    const take = Number.isFinite(takeRaw) ? Math.min(100, Math.max(1, Math.floor(takeRaw))) : 50;

    const where: any = {};
    if (["OPEN", "WAITING_OTHER", "BOTH_SUBMITTED", "SENT", "RESOLVED", "CANCELLED"].includes(status)) {
      where.status = status;
    }

    const items = await prisma.dispute.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      include: {
        task: { select: { id: true, title: true, reward: true, authorId: true } },
        evidence: { select: { id: true, status: true, authorId: true } },
        client: { select: { id: true, name: true, email: true } },
        worker: { select: { id: true, name: true, email: true } },
        resolvedBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({
      items: items.map((d) => ({
        id: d.id,
        status: d.status,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
        startedAt: d.startedAt.toISOString(),
        deadlineAt: d.deadlineAt.toISOString(),
        resolvedAt: d.resolvedAt ? d.resolvedAt.toISOString() : null,
        resultText: d.resultText,
        split: safeParse(d.splitJson) ?? {},
        task: d.task ? { id: d.task.id, title: d.task.title, reward: d.task.reward, authorId: d.task.authorId } : null,
        evidence: d.evidence ? { id: d.evidence.id, status: d.evidence.status, authorId: d.evidence.authorId } : null,
        client: d.client ? { id: d.client.id, name: d.client.name ?? null, email: d.client.email ?? null } : null,
        worker: d.worker ? { id: d.worker.id, name: d.worker.name ?? null, email: d.worker.email ?? null } : null,
        resolvedBy: d.resolvedBy ? { id: d.resolvedBy.id, name: d.resolvedBy.name ?? null, email: d.resolvedBy.email ?? null } : null,
      })),
    });
  } catch (e) {
    console.error("GET /api/admin/disputes error", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

function safeParse(s: string) {
  try { return JSON.parse(s); } catch { return null; }
}
