// app/api/evidences/[id]/needs-fixes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureUserFromReq } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await ensureUserFromReq(req);
    if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

    const evidenceId = (params?.id || '').trim();
    if (!evidenceId) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

    const body = await req.json().catch(() => ({} as any));
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
    if (!reason) return NextResponse.json({ error: 'missing_reason' }, { status: 400 });

    const evidence = await prisma.taskEvidence.findUnique({
      where: { id: evidenceId },
      include: { task: true },
    });
    if (!evidence) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    if (evidence.task.authorId !== user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    if (evidence.status === 'APPROVED') return NextResponse.json({ error: 'already_approved' }, { status: 409 });
    if (evidence.status === 'EXPIRED') return NextResponse.json({ error: 'expired' }, { status: 409 });
    if (evidence.status === 'NEEDS_FIXES') {
      return NextResponse.json({ ok: true, status: 'NEEDS_FIXES' }, { status: 200 });
    }

    // only once per task+worker
    const already = await prisma.taskEvidence.findFirst({
      where: {
        taskId: evidence.taskId,
        authorId: evidence.authorId,
        status: 'NEEDS_FIXES',
      },
      select: { id: true },
    });
    if (already) return NextResponse.json({ error: 'needs_fixes_once' }, { status: 409 });

    await prisma.taskEvidence.update({
      where: { id: evidenceId },
      data: {
        status: 'NEEDS_FIXES',
        decidedById: user.id,
        decidedAt: new Date(),
        needsFixesAt: new Date(),
        needsFixesReason: reason.slice(0, 2000),

        // 🆕 worker notification: client requested fixes
        workerDecisionSeen: false,

        // needs-fixes timer is now active (UI reads needsFixesAt)
      },
    });

    return NextResponse.json({ ok: true, status: 'NEEDS_FIXES' }, { status: 200 });
  } catch (e) {
    console.error('evidence_needs_fixes_error', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
