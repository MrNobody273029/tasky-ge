import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureUserFromReq } from '@/lib/auth';

// helpers — enum ველებისთვის
function mapStatus(v: unknown): 'DRAFT' | 'PUBLISHED' {
  return v === 'published' ? 'PUBLISHED' : 'DRAFT';
}
function mapWhere(v: unknown): 'REMOTE' | 'ONSITE' {
  return v === 'onsite' ? 'ONSITE' : 'REMOTE';
}

export async function POST(req: Request) {
  try {
    // 🔒 ავტორიზაცია (+ DB-ში იუზერის არსებობის გარანტია)
    const user = await ensureUserFromReq(req);
    if (!user) {
      return NextResponse.json({ error: 'auth_required' }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as any;

    // ---- photos normalize (იღებს ან string[], ან JSON string-ს) ----
    let photosStr = '[]';
    if (body.photos !== undefined) {
      if (Array.isArray(body.photos)) {
        photosStr = JSON.stringify(
          body.photos
            .map((s: any) => String(s))
            .map((s: string) => s.trim())
            .filter(Boolean)
            // ⚠️ აქ იყავი შეცდომა regex-ში — ვიყენებთ მარტივ და სწორ ვერსიას
            .filter((s: string) => /^https?:\/\/\S+/i.test(s))
            .slice(0, 20)
        );
      } else if (typeof body.photos === 'string') {
        // მოვიდა უკვე JSON string-ად ("[...]")
        photosStr = body.photos;
      }
    }

    // სქემასთან 1:1 შესაბამისი ობიექტი
    const data = {
      authorId: user.id,
      locale: String(body.locale || 'ka'),
      title: String(body.title || '').trim(),
      desc: String(body.desc || '').trim(),
      category: String(body.category || '').trim(), // String ველი
      skill: String(body.skill || '').trim(),       // String ველი
      reward: Math.max(0, Math.round(Number(body.reward || 0))),
      deadline: body.deadline ? new Date(body.deadline) : null,
      where: mapWhere(body.where),
      address: body.where === 'onsite' ? (body.address ?? null) : null,
      exclusive: !!body.exclusive,
      photos: photosStr,                // ✅ ვინახავთ როგორც JSON string-ს
      proof: String(body.proof ?? ''),
      status: mapStatus(body.status),
    };

    // მინიმალური ვალიდაცია
    if (!data.title || !data.desc) {
      return NextResponse.json({ error: 'validation_failed' }, { status: 400 });
    }

    const created = await prisma.task.create({ data, select: { id: true } });
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (e) {
    console.error('POST /api/tasks error:', e);
    return NextResponse.json({ error: 'create_failed' }, { status: 400 });
  }
}
