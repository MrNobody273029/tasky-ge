import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureUserFromReq } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await ensureUserFromReq(req);
    if (!me || !(me as any).isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const id = String(params?.id || "").trim();
    if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

    const body = (await req.json().catch(() => ({}))) as any;
    const note = String(body?.note || "").trim().slice(0, 4000);

    const upd = await prisma.dispute.update({
      where: { id },
      data: {
        status: "CANCELLED",
        resolvedById: me.id,
        resolvedAt: new Date(),
        resultText: note,
      },
      select: { id: true, status: true },
    });

    return NextResponse.json({ ok: true, id: upd.id, status: upd.status }, { status: 200 });
  } catch (e) {
    console.error("POST /api/admin/disputes/[id]/cancel error", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
