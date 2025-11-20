// src/lib/auth.ts
import { prisma } from "@/lib/prisma";

/** ქუქების უსაფრთხო პარსერი */
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

/** შიდა ჰელპერი — ვკითხულობთ uid/email-ს ჰედერებიდან ან ქუქიდან */
function readIdEmailFromHeaders(h: Headers): { id: string; email?: string } {
  const hxIdRaw = h.get("x-user-id")?.trim() || "";
  const hxEmailRaw = h.get("x-email")?.trim() || "";

  const cookies = parseCookies(h);
  const cXId = (cookies["x-user-id"] || "").trim();
  const cUid = (cookies["uid"] || "").trim();
  const cTok = (cookies["token"] || "").trim();
  const cEmail = (cookies["email"] || "").trim().toLowerCase();

  // პრიორიტეტი: ჰედერი → ქუქი x-user-id → uid/token → guest
  const idCandidate =
    hxIdRaw ||
    cXId ||
    cUid ||
    cTok ||
    "";

  const emailCandidate =
    (hxEmailRaw ? hxEmailRaw.toLowerCase() : "") ||
    cEmail ||
    undefined;

  const id = (idCandidate || emailCandidate || "guest").toLowerCase();

  // თუ email ამოვიკითხეთ, ჩავაბრუნოთაც
  if (emailCandidate) return { id, email: emailCandidate };
  return { id };
}

/** ძველი სინქრონული API — თუ გჭირდება უბრალოდ ID (DB-ს გარეშე) */
export function getUserIdFromReq(req: Request): string {
  return readIdEmailFromHeaders(req.headers).id;
}

/** ახალი API — უზრუნველყოფს, რომ იუზერი არსებობდეს DB-ში (თუ გვაქვს რეალური x-user-id) */
export async function ensureUserFromReq(req: Request) {
  const { id, email } = readIdEmailFromHeaders(req.headers);

  // guest-ს DB-ში არ ვქმნით
  if (!id || id === "guest") {
    // მხოლოდ email-ის შემთხვევაში — ვცადოთ მოძებნა email-ით და დავბრუნდეთ, შექმნა არ გვინდა
    if (email) {
      const byEmail = await prisma.user.findUnique({ where: { email } }).catch(() => null);
      return byEmail || null;
    }
    return null;
  }

  // 1) სცადე მოძებნო ID-ით
  const byId = await prisma.user.findUnique({ where: { id } }).catch(() => null);
  if (byId) return byId;

  // 2) სცადე მოძებნო Email-ით (თუ ემთხვევა სხვა ID-ს, მაინც დავუბრუნდეთ არსებულს)
  if (email) {
    const byEmail = await prisma.user.findUnique({ where: { email } }).catch(() => null);
    if (byEmail) return byEmail;
  }

  // 3) ვეღარ ვიპოვეთ — placeholder-ს მხოლოდ მაშინ ვქმნით,
  // როცა გვაქვს არა-guest `x-user-id` (და ის არაა email ფორმატი)
  const looksLikeRealId = !id.includes("@") && id.length >= 10; // cuid/uuid feel
  if (!looksLikeRealId) {
    // ცუდია email-ის ID-დ გამოყენება → გავჩერდეთ
    return null;
  }

  const safeEmail =
    (email && email.includes("@") ? email : `dev_${Date.now()}_${Math.random().toString(36).slice(2)}@dev.local`)
      .toLowerCase();

  const user = await prisma.user.create({
    data: {
      id,
      email: safeEmail,
      // placeholder — რეალურ რეგისტრაციაზე გადაიფარება.
      passwordHash: "DEV_PLACEHOLDER",
    },
  });

  return user;
}
