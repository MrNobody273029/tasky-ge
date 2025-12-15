// src/lib/auth.ts
import { prisma } from "@/lib/prisma";
import { createHmac, timingSafeEqual } from "node:crypto";

/** Cookie parser */
function parseCookies(h: Headers): Record<string, string> {
  const raw = h.get("cookie") || "";
  const out: Record<string, string> = {};
  for (const part of raw.split(";")) {
    const [k, ...rest] = part.split("=");
    if (!k) continue;
    const key = k.trim();
    const val = decodeURIComponent((rest.join("=") || "").trim());
    if (key) out[key] = val;
  }
  return out;
}

function signUserId(userId: string): string {
  const secret = process.env.AUTH_SECRET || "";
  if (!secret) return "";
  return createHmac("sha256", secret).update(userId).digest("hex");
}

function safeEqualHex(a: string, b: string) {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    return ba.length === bb.length && timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/**
 * Auth read:
 * - Prefer httpOnly cookies: x-user-id + x-user-sig
 * - DEV fallback: allow x-user-id without signature only in non-production
 */
function readAuthFromHeaders(h: Headers): { userId?: string } {
  const cookies = parseCookies(h);

  const userId = (cookies["x-user-id"] || "").trim();
  const sig = (cookies["x-user-sig"] || "").trim();

  if (!userId) return {};

  const expected = signUserId(userId);
  const isProd = process.env.NODE_ENV === "production";

  // ✅ Signed session
  if (sig && expected && safeEqualHex(sig, expected)) {
    return { userId };
  }

  // ⚠️ DEV-only fallback (so local dev არ დაგენგრეს)
  if (!isProd) {
    return { userId };
  }

  return {};
}

/** old helper (DB-ის გარეშე) */
export function getUserIdFromReq(req: Request): string {
  return readAuthFromHeaders(req.headers).userId || "guest";
}

/** main helper — only returns real DB user or null */
export async function ensureUserFromReq(req: Request) {
  const userId = readAuthFromHeaders(req.headers).userId;
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { id: userId } }).catch(() => null);
  return user || null;
}
