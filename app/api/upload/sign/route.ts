// app/api/upload/sign/route.ts
import { NextResponse } from "next/server";
import { cloudPublic, signForFolder, resolveFolder } from "@/lib/cloudinary";

type Kind = "task" | "avatar" | "evidence";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { kind?: Kind };
    const kind: Kind = (["task", "avatar", "evidence"].includes(body?.kind || "")
      ? body!.kind
      : "task") as Kind;

    const folder = resolveFolder(kind);
    const { signature, timestamp } = signForFolder(folder);

    return NextResponse.json({
      signature,
      timestamp,
      folder,
      cloud: {
        cloudName: cloudPublic.cloudName,
        apiKey: cloudPublic.apiKey,
      },
    });
  } catch (e) {
    console.error("POST /api/upload/sign error:", e);
    return NextResponse.json({ error: "sign_failed" }, { status: 500 });
  }
}
