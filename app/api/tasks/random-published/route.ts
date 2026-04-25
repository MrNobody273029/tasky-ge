import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ერთ შემთხვევით გამოქვეყნებულ task.id-ს აბრუნებს (სტაბილური orderBy)
async function pickRandomPublishedId() {
  const now = new Date();
  const where = {
    status: 'PUBLISHED' as const,
    OR: [{ deadline: null }, { deadline: { gt: now } }],
  };
  const count = await prisma.task.count({ where });
  if (!count) return null;
  const skip = Math.floor(Math.random() * count);
  const rows = await prisma.task.findMany({
    where,
    orderBy: { id: 'asc' },
    skip,
    take: 1,
    select: { id: true },
  });
  return rows[0]?.id ?? null;
}

export async function GET() {
  try {
    const id = await pickRandomPublishedId();
    if (!id) return NextResponse.json({ error: 'No tasks' }, { status: 404 });
    return NextResponse.json({ id });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
