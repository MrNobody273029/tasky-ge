import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureUserFromReq } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function requireAdmin(me: any) {
  return Boolean(me?.isAdmin);
}

function safeJsonArr(v: any): string[] {
  try {
    const arr = JSON.parse(v || '[]');
    return Array.isArray(arr) ? arr.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

const ALLOWED_STATUSES = new Set([
  'OPEN',
  'WAITING_OTHER',
  'BOTH_SUBMITTED',
  'SENT',
  'RESOLVED',
  'CANCELLED',
]);

export async function GET(req: NextRequest) {
  try {
    const me = await ensureUserFromReq(req);
    if (!me) return NextResponse.json({ error: 'auth_required' }, { status: 401 });
    if (!requireAdmin(me)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const statusRaw = (searchParams.get('status') || '').trim().toUpperCase();
    const status = ALLOWED_STATUSES.has(statusRaw) ? statusRaw : '';
    const take = Math.min(200, Math.max(10, Number(searchParams.get('take') || 80)));

    /**
     * ✅ HARD GUARANTEE (what you asked):
     * - Active disputes: ONLY when BOTH submitted AND status in [BOTH_SUBMITTED, SENT]
     * - Done disputes: [RESOLVED, CANCELLED]
     * - OPEN / WAITING_OTHER never returns (unless they are explicitly RESOLVED/CANCELLED, which they aren't)
     */
    const baseWhere: any = {
      OR: [
        { status: 'RESOLVED' },
        { status: 'CANCELLED' },
        {
          status: { in: ['BOTH_SUBMITTED', 'SENT'] },
          clientSubmitted: true,
          workerSubmitted: true,
        },
      ],
    };

    // optional explicit status filter (still respects the rule above for active statuses)
    if (status) {
      baseWhere.AND = [{ status }];
    }

    if (q) {
      baseWhere.AND = baseWhere.AND || [];
      baseWhere.AND.push({
        OR: [
          { id: { contains: q, mode: 'insensitive' } },
          { taskId: { contains: q, mode: 'insensitive' } },
          { evidenceId: { contains: q, mode: 'insensitive' } },
          { task: { title: { contains: q, mode: 'insensitive' } } },
          { client: { email: { contains: q, mode: 'insensitive' } } },
          { worker: { email: { contains: q, mode: 'insensitive' } } },
          { client: { name: { contains: q, mode: 'insensitive' } } },
          { worker: { name: { contains: q, mode: 'insensitive' } } },
        ],
      });
    }

    const rows = await prisma.dispute.findMany({
      where: baseWhere,
      orderBy: [{ status: 'asc' }, { startedAt: 'desc' }],
      take,
      include: {
        task: {
          select: {
            id: true,
            title: true,
            desc: true,
            reward: true,
            deadline: true,
            where: true,
            address: true,
            exclusive: true,
            locale: true,
            category: true,
            skill: true,
            photos: true,
            proof: true,
            createdAt: true,
            authorId: true,
          },
        },
        evidence: {
          select: {
            id: true,
            createdAt: true,
            status: true,
            text: true,
            photos: true,
            videos: true,
            files: true,

            fixForId: true,
            fixFor: {
              select: {
                id: true,
                createdAt: true,
                status: true,
                text: true,
                photos: true,
                videos: true,
                files: true,
                needsFixesReason: true,
              },
            },
            fixes: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                id: true,
                createdAt: true,
                status: true,
                text: true,
                photos: true,
                videos: true,
                files: true,
              },
            },
          },
        },
        client: { select: { id: true, name: true, email: true, phone: true, image: true, commissionPct: true } },
        worker: { select: { id: true, name: true, email: true, phone: true, image: true, commissionPct: true } },
        resolvedBy: { select: { id: true, name: true, email: true } },
      },
    });

    const payload = rows.map((d: any) => ({
      id: d.id,
      taskId: d.taskId,
      evidenceId: d.evidenceId,

      status: d.status,
      startedAt: d.startedAt ? d.startedAt.toISOString() : null,
      deadlineAt: d.deadlineAt ? d.deadlineAt.toISOString() : null,

      clientSubmitted: Boolean(d.clientSubmitted),
      workerSubmitted: Boolean(d.workerSubmitted),

      clientText: d.clientText || '',
      workerText: d.workerText || '',
      clientPhotos: safeJsonArr(d.clientPhotos),
      clientVideos: safeJsonArr(d.clientVideos),
      clientFiles: safeJsonArr(d.clientFiles),
      workerPhotos: safeJsonArr(d.workerPhotos),
      workerVideos: safeJsonArr(d.workerVideos),
      workerFiles: safeJsonArr(d.workerFiles),

      resultText: d.resultText || '',
      splitJson: d.splitJson || '{}',

      resolvedAt: d.resolvedAt ? d.resolvedAt.toISOString() : null,
      resolvedBy: d.resolvedBy ? d.resolvedBy : null,

      task: d.task
        ? {
            id: d.task.id,
            title: d.task.title,
            desc: d.task.desc,
            reward: d.task.reward,
            deadline: d.task.deadline ? d.task.deadline.toISOString() : null,
            where: d.task.where,
            address: d.task.address || null,
            exclusive: Boolean(d.task.exclusive),
            locale: d.task.locale,
            category: d.task.category,
            skill: d.task.skill,
            photos: safeJsonArr(d.task.photos),
            proof: d.task.proof || '',
            createdAt: d.task.createdAt ? d.task.createdAt.toISOString() : null,
            authorId: d.task.authorId,
          }
        : null,

      evidence: d.evidence
        ? {
            id: d.evidence.id,
            createdAt: d.evidence.createdAt ? d.evidence.createdAt.toISOString() : null,
            status: d.evidence.status,
            text: d.evidence.text || '',
            photos: safeJsonArr(d.evidence.photos),
            videos: safeJsonArr(d.evidence.videos),
            files: safeJsonArr(d.evidence.files),

            fixForId: d.evidence.fixForId ?? null,
            fixFor: d.evidence.fixFor
              ? {
                  id: d.evidence.fixFor.id,
                  createdAt: d.evidence.fixFor.createdAt ? d.evidence.fixFor.createdAt.toISOString() : null,
                  status: d.evidence.fixFor.status,
                  text: d.evidence.fixFor.text || '',
                  photos: safeJsonArr(d.evidence.fixFor.photos),
                  videos: safeJsonArr(d.evidence.fixFor.videos),
                  files: safeJsonArr(d.evidence.fixFor.files),
                  needsFixesReason: d.evidence.fixFor.needsFixesReason ?? null,
                }
              : null,

            fixes: Array.isArray(d.evidence.fixes)
              ? d.evidence.fixes.map((x: any) => ({
                  id: x.id,
                  createdAt: x.createdAt ? x.createdAt.toISOString() : null,
                  status: x.status,
                  text: x.text || '',
                  photos: safeJsonArr(x.photos),
                  videos: safeJsonArr(x.videos),
                  files: safeJsonArr(x.files),
                }))
              : [],
          }
        : null,

      client: d.client,
      worker: d.worker,
    }));

    return NextResponse.json(payload, { status: 200 });
  } catch (e: any) {
    console.error('GET /api/admin/disputes error', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
