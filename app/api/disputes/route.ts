import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureUserFromReq } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const me = await ensureUserFromReq(req);
    if (!me) return NextResponse.json({ error: "auth_required" }, { status: 401 });

    const url = new URL(req.url);
    const status = (url.searchParams.get("status") || "").toUpperCase();
    const takeRaw = Number(url.searchParams.get("take") || "30");
    const take = Number.isFinite(takeRaw) ? Math.min(100, Math.max(1, Math.floor(takeRaw))) : 30;

    const where: any = {
      OR: [{ clientId: me.id }, { workerId: me.id }],
    };

    // allow filter by status if passed
    if (["OPEN", "WAITING_OTHER", "BOTH_SUBMITTED", "SENT", "RESOLVED", "CANCELLED"].includes(status)) {
      where.status = status;
    }

    const items = await prisma.dispute.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      include: {
        task: { select: { id: true, title: true, reward: true } },
        evidence: { select: { id: true, status: true, createdAt: true } },
      },
    });

    return NextResponse.json(
      items.map((d) => ({
        id: d.id,
        status: d.status,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
        startedAt: d.startedAt.toISOString(),
        deadlineAt: d.deadlineAt.toISOString(),
        resolvedAt: d.resolvedAt ? d.resolvedAt.toISOString() : null,
        resultText: d.resultText || "",
        splitJson: d.splitJson,
        task: d.task ? { id: d.task.id, title: d.task.title, reward: d.task.reward } : null,
        evidence: d.evidence
          ? { id: d.evidence.id, status: d.evidence.status, createdAt: d.evidence.createdAt.toISOString() }
          : null,
      })),
      { status: 200 }
    );
  } catch (e) {
    console.error("GET /api/disputes error", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
