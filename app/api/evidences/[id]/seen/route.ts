// app/api/evidences/[id]/seen/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureUserFromReq } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const me = await ensureUserFromReq(req);
    if (!me) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

    const evidenceId = (params?.id || '').trim();
    if (!evidenceId) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

    const body = await req.json().catch(() => ({} as any));
    const kind = typeof body?.kind === 'string' ? body.kind.trim() : '';

    const e = await prisma.taskEvidence.findUnique({
      where: { id: evidenceId },
      include: { task: true },
    });
    if (!e) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const isWorker = e.authorId === me.id;
    const isClient = e.task.authorId === me.id;

    if (kind === 'worker_decision') {
      if (!isWorker) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      await prisma.taskEvidence.update({ where: { id: evidenceId }, data: { workerDecisionSeen: true } });
      return NextResponse.json({ ok: true });
    }

    if (kind === 'client_system') {
      if (!isClient) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      await prisma.taskEvidence.update({ where: { id: evidenceId }, data: { clientSystemSeen: true } });
      return NextResponse.json({ ok: true });
    }

    if (kind === 'worker_client_review') {
      if (!isWorker) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      await prisma.taskEvidence.update({ where: { id: evidenceId }, data: { workerSawClientReview: true } });
      return NextResponse.json({ ok: true });
    }

    if (kind === 'client_worker_review') {
      if (!isClient) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      await prisma.taskEvidence.update({ where: { id: evidenceId }, data: { clientSawWorkerReview: true } });
      return NextResponse.json({ ok: true });
    }

    if (kind === 'worker_rating_prompt') {
      if (!isWorker) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      await prisma.taskEvidence.update({ where: { id: evidenceId }, data: { workerSawRatingPrompt: true } });
      return NextResponse.json({ ok: true });
    }
    if (kind === 'client_dispute') {
  if (!isClient) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  await prisma.dispute.update({ where: { evidenceId }, data: { clientSeen: true } });
  return NextResponse.json({ ok: true });
}

if (kind === 'worker_dispute') {
  if (!isWorker) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  await prisma.dispute.update({ where: { evidenceId }, data: { workerSeen: true } });
  return NextResponse.json({ ok: true });
}


    if (kind === 'client_rating_prompt') {
      if (!isClient) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      await prisma.taskEvidence.update({ where: { id: evidenceId }, data: { clientSawRatingPrompt: true } });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'bad_kind' }, { status: 400 });
  } catch (e) {
    console.error('evidence_seen_error', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
