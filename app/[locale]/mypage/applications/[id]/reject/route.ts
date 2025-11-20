import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  const candidates = ['taskApplication', 'application', 'taskRequest', 'taskApply'];
  for (const name of candidates) {
    const m = (prisma as any)[name];
    if (!m?.update) continue;
    try {
      await m.update({ where: { id }, data: { status: 'REJECTED' } });
      return NextResponse.json({ ok: true });
    } catch {
      // ცადე შემდეგი შესაძლო მოდელი
    }
  }
  return NextResponse.json({ error: 'not_found' }, { status: 404 });
}
