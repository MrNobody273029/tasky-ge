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
    if (!m?.findUnique) continue;
    try {
      const app = await m.findUnique({ where: { id } , include: { task: true }});
      if (!app) continue;

      // ეს აპი → APPROVED
      await m.update({ where: { id }, data: { status: 'APPROVED' } });

      // ამავე ტასკის სხვა აპები → REJECTED
      if (app.taskId) {
        await m.updateMany({
          where: { taskId: app.taskId, NOT: { id } },
          data: { status: 'REJECTED' },
        });
      }

      // სურვილისამებრ, შეგიძლია ტასკზეც მონიშვნა დადო (მაგ. lockedBy/workerId), თუ გაქვს სქემაში ველი
      // await (prisma as any).task.update({ where: { id: app.taskId }, data: { lockedById: app.workerId } })

      return NextResponse.json({ ok: true });
    } catch {
      // ცადე შემდეგი მოდელი
    }
  }
  return NextResponse.json({ error: 'not_found' }, { status: 404 });
}
