import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureUserFromReq } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function requireAdmin(me: any) {
  return Boolean(me?.isAdmin);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await ensureUserFromReq(req);
    if (!me) return NextResponse.json({ error: 'auth_required' }, { status: 401 });
    if (!requireAdmin(me)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const disputeId = String(params?.id || '').trim();
    if (!disputeId) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

    const d = await prisma.dispute.findUnique({ where: { id: disputeId }, select: { id: true, status: true } });
    if (!d) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (d.status === 'RESOLVED') return NextResponse.json({ error: 'locked' }, { status: 409 });

    await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: 'CANCELLED',
        resolvedAt: new Date(),
        resolvedById: me.id,
        clientSeen: false,
        workerSeen: false,
      },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error('POST /api/admin/disputes/[id]/cancel error', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
