// app/api/my/evidences/summary/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureUserFromReq } from '@/lib/auth';

function getEvidenceModel() {
  const db: any = prisma as any;

  // ყველაზე ხშირი ვარიანტები
  return (
    db.evidence ||
    db.evidences ||
    db.proof ||
    db.proofs ||
    db.taskEvidence ||
    db.taskEvidences ||
    null
  );
}

export async function GET(req: Request) {
  try {
    const user = await ensureUserFromReq(req);
    if (!user) {
      return NextResponse.json({ error: 'auth_required' }, { status: 401 });
    }

    const Evidence = getEvidenceModel();
    if (!Evidence) {
      return NextResponse.json(
        { error: 'evidence_model_not_found_in_prisma' },
        { status: 500 },
      );
    }

    // ⚠️ clientId/workerId თუ შენთან სხვა field-ებია, ეს ნაწილი შეცვალე ზუსტად ისე როგორც /api/my/evidences route.ts-ში გაქვს
    const [incoming, outgoing] = await Promise.all([
      Evidence.findMany({
        where: { clientId: user.id },
        select: {
          status: true,
          clientSystemSeen: true,
          clientSawWorkerReview: true,
          clientSawRatingPrompt: true,
        },
      }),
      Evidence.findMany({
        where: { workerId: user.id },
        select: {
          status: true,
          workerDecisionSeen: true,
          workerSawClientReview: true,
          workerSawRatingPrompt: true,
        },
      }),
    ]);

    const incomingNotifCount = (incoming as any[]).filter((ev) => {
      const system =
        (ev.status === 'APPROVED' || ev.status === 'EXPIRED') &&
        ev.clientSystemSeen === false;

      const rating =
        ev.clientSawWorkerReview === false ||
        (ev.status === 'EXPIRED' && ev.clientSawRatingPrompt === false);

      return Boolean(system || rating);
    }).length;

    const outgoingNotifCount = (outgoing as any[]).filter((ev) => {
      const decision =
        (ev.status === 'APPROVED' ||
          ev.status === 'NEEDS_FIXES' ||
          ev.status === 'EXPIRED') &&
        ev.workerDecisionSeen === false;

      const rating =
        ev.workerSawClientReview === false ||
        (ev.status === 'EXPIRED' && ev.workerSawRatingPrompt === false);

      return Boolean(decision || rating);
    }).length;

    return NextResponse.json({ incomingNotifCount, outgoingNotifCount });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'server_error' },
      { status: 500 },
    );
  }
}
