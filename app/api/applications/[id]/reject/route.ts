import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function getUid(req: NextRequest): string {
  const h = req.headers.get('x-user-id') || '';
  if (h) return h;
  const cookie = req.headers.get('cookie') || '';
  const m = cookie.match(/(?:^|;\s*)x-user-id=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const uid = getUid(req);
  if (!uid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const app = await prisma.taskApplication.findUnique({
    where: { id: params.id },
    include: { task: true },
  });
  if (!app) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (app.task.authorId !== uid) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  await prisma.taskApplication.update({
    where: { id: app.id },
    data: { status: 'REJECTED', decidedAt: new Date() },
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
