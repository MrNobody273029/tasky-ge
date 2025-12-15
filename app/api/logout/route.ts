// app/api/logout/route.ts
import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  const isProd = process.env.NODE_ENV === "production";

  const names = ["x-user-id", "x-user-sig"];

  for (const name of names) {
    res.cookies.set({
      name,
      value: "",
      path: "/",
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 0,
    });
  }

  return res;
}
