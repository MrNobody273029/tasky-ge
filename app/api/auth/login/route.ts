// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/crypto";
import { createHmac } from "node:crypto";

function signUserId(userId: string) {
  const secret = process.env.AUTH_SECRET || "";
  if (!secret) return "";
  return createHmac("sha256", secret).update(userId).digest("hex");
}

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    const em = String(email || "").trim().toLowerCase();
    const pw = String(password || "");

    const user = await prisma.user.findUnique({ where: { email: em } });
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }

    const ok = await verifyPassword(pw, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }

    const isAdmin = (user as any).isAdmin === true;
    const res = NextResponse.json({ id: user.id, email: user.email, isAdmin }, { status: 200 });

    const isProd = process.env.NODE_ENV === "production";
    const sig = signUserId(user.id);

    // ✅ httpOnly cookies (real auth)
    res.cookies.set({
      name: "x-user-id",
      value: user.id,
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 დღე
    });

    res.cookies.set({
      name: "x-user-sig",
      value: sig,
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return res;
  } catch {
    return NextResponse.json({ error: "login_failed" }, { status: 400 });
  }
}
