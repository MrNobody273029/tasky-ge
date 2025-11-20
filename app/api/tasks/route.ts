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

    const b = await req.json().catch(() => ({} as any));

    // სქემასთან 1:1 შესაბამისი ობიექტი
    const data = {
      authorId: user.id,
      locale: String(b.locale || 'ka'),
      title: String(b.title || '').trim(),
      desc: String(b.desc || '').trim(),
      category: String(b.category || '').trim(), // String ველი
      skill: String(b.skill || '').trim(),       // String ველი
      reward: Number(b.reward) || 0,
      deadline: b.deadline ? new Date(b.deadline) : null,
      where: mapWhere(b.where),
      address: b.where === 'onsite' ? (b.address ?? null) : null,
      exclusive: !!b.exclusive,
      photos: JSON.stringify(Array.isArray(b.photos) ? b.photos : []),
      proof: String(b.proof ?? ''),
      status: mapStatus(b.status),
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
