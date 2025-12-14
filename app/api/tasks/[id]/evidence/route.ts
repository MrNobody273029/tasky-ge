// app/api/tasks/[id]/evidence/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureUserFromReq } from '@/lib/auth';
import { promises as fs } from 'fs';
import path from 'path';

const HOURS_96_MS = 96 * 60 * 60 * 1000;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await ensureUserFromReq(req);
    if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });
    const userId = user.id;

    const task = await prisma.task.findUnique({
      where: { id: params.id },
      select: { id: true, authorId: true },
    });
    if (!task) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const taskId = task.id;

    // resubmit context from query (?fixFor=EVIDENCE_ID) OR JSON body fixForId
    const url = new URL(req.url);
    const fixForFromQuery = (url.searchParams.get('fixFor') || '').trim();

    const contentType = req.headers.get('content-type') || '';

    // helper: validate resubmit evidence if provided (fast fail)
    async function validateFixFor(fixForId: string) {
      if (!fixForId) return null;

      const parent = await prisma.taskEvidence.findUnique({
        where: { id: fixForId },
        select: {
          id: true,
          taskId: true,
          authorId: true,
          status: true,
          needsFixesAt: true,
        },
      });

      if (!parent) return { error: 'fixfor_not_found' as const };
      if (parent.taskId !== taskId) return { error: 'fixfor_wrong_task' as const };
      if (parent.authorId !== userId) return { error: 'fixfor_not_owner' as const };
      if (parent.status !== 'NEEDS_FIXES') return { error: 'fixfor_not_needs_fixes' as const };

      // IMPORTANT: block double resubmission
      const already = await prisma.taskEvidence.findFirst({
        where: { fixForId },
        select: { id: true },
      });
      if (already) return { error: 'fixfor_already_resubmitted' as const };

      // must still be in time
      if (!parent.needsFixesAt) return { error: 'fixfor_missing_time' as const };

      const deadline = new Date(parent.needsFixesAt).getTime() + HOURS_96_MS;
      if (Date.now() > deadline) return { error: 'fixfor_expired' as const };

      return { ok: true as const };
    }

    /* =========================================================
       BRANCH A: JSON body (Cloudinary URLs already uploaded)
       ========================================================= */
    if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => ({} as any));
      const text = String(body?.text || '').trim();

      const photos = Array.isArray(body?.photos)
        ? body.photos.filter((x: any) => typeof x === 'string')
        : [];
      const videos = Array.isArray(body?.videos)
        ? body.videos.filter((x: any) => typeof x === 'string')
        : [];
      const files = Array.isArray(body?.files)
        ? body.files.filter((x: any) => typeof x === 'string')
        : [];

      const hasSomething = text.length > 0 || photos.length > 0 || videos.length > 0 || files.length > 0;
      if (!hasSomething) {
        return NextResponse.json({ error: 'empty_evidence' }, { status: 400 });
      }

      const fixForId = String(body?.fixForId || fixForFromQuery || '').trim();

      // fast validation (better UX)
      if (fixForId) {
        const v = await validateFixFor(fixForId);
        if (!v || ('error' in v)) {
          return NextResponse.json({ error: (v as any)?.error || 'fixfor_invalid' }, { status: 409 });
        }
      }

      // ✅ Create + stop parent countdown atomically
      try {
        const ev = await prisma.$transaction(async (tx) => {
          // re-check in TX to avoid race with cron / double submit
          if (fixForId) {
            const parent = await tx.taskEvidence.findUnique({
              where: { id: fixForId },
              select: {
                id: true,
                taskId: true,
                authorId: true,
                status: true,
                needsFixesAt: true,
              },
            });

            if (!parent) throw new Error('fixfor_not_found');
            if (parent.taskId !== taskId) throw new Error('fixfor_wrong_task');
            if (parent.authorId !== userId) throw new Error('fixfor_not_owner');
            if (parent.status !== 'NEEDS_FIXES') throw new Error('fixfor_not_needs_fixes');

            const already = await tx.taskEvidence.findFirst({
              where: { fixForId },
              select: { id: true },
            });
            if (already) throw new Error('fixfor_already_resubmitted');

            if (!parent.needsFixesAt) throw new Error('fixfor_missing_time');
            const deadline = new Date(parent.needsFixesAt).getTime() + HOURS_96_MS;
            if (Date.now() > deadline) throw new Error('fixfor_expired');
          }

          const created = await tx.taskEvidence.create({
            data: {
              taskId,
              authorId: userId,
              text,
              photos: JSON.stringify(photos),
              videos: JSON.stringify(videos),
              files: JSON.stringify(files),

              fixForId: fixForId || null,

              autoApproved: false,
              decidedAt: null,
              decidedById: null,
              status: 'PENDING',

              clientSystemSeen: true,
              workerDecisionSeen: true,
              clientSawRatingPrompt: true,
              workerSawRatingPrompt: true,
            },
            select: { id: true },
          });

          // ✅ stop 96h countdown on parent so it never expires after successful resubmit
          if (fixForId) {
            await tx.taskEvidence.update({
              where: { id: fixForId },
              data: {
                needsFixesAt: null, // ✅ crucial: disables countdown + cron expiry
                workerDecisionSeen: true,
              },
            });
          }

          return created;
        });

        return NextResponse.json({ ok: true, id: ev.id });
      } catch (e: any) {
        const msg = String(e?.message || '');
        const known = [
          'fixfor_not_found',
          'fixfor_wrong_task',
          'fixfor_not_owner',
          'fixfor_not_needs_fixes',
          'fixfor_already_resubmitted',
          'fixfor_missing_time',
          'fixfor_expired',
        ];
        if (known.includes(msg)) {
          return NextResponse.json({ error: msg }, { status: 409 });
        }
        throw e;
      }
    }

    /* =========================================================
       BRANCH B: multipart/form-data (old way)
       ========================================================= */
    const form = await req.formData();
    const rawText = (form.get('text') ?? '').toString();
    const text = rawText.trim();

    const photoEntries = form.getAll('photos');
    const photoFiles = photoEntries.filter((v): v is File => v instanceof File && v.size > 0);
    const photosLimited = photoFiles.slice(0, 6);

    const videoRaw = form.get('video');
    const videoFile = videoRaw instanceof File && videoRaw.size > 0 ? videoRaw : null;

    const fileEntries = form.getAll('files');
    const zipFiles = fileEntries.filter((v): v is File => v instanceof File && v.size > 0);

    const hasSomething = text.length > 0 || photosLimited.length > 0 || !!videoFile || zipFiles.length > 0;
    if (!hasSomething) {
      return NextResponse.json({ error: 'empty_evidence' }, { status: 400 });
    }

    // resubmit from form (optional)
    const fixForFromForm = String(form.get('fixForId') || '').trim();
    const fixForId = (fixForFromForm || fixForFromQuery || '').trim();

    // fast validation
    if (fixForId) {
      const v = await validateFixFor(fixForId);
      if (!v || ('error' in v)) {
        return NextResponse.json({ error: (v as any)?.error || 'fixfor_invalid' }, { status: 409 });
      }
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'evidence', taskId);
    await fs.mkdir(uploadDir, { recursive: true });

    const photoUrls: string[] = [];
    const videoUrls: string[] = [];
    const fileUrls: string[] = [];

    async function saveOne(file: File, prefix: string): Promise<string> {
      const arrayBuf = await file.arrayBuffer();
      const buf = Buffer.from(arrayBuf);

      const orig = file.name || 'file';
      const parts = orig.split('.');
      const ext = parts.length > 1 ? `.${parts[parts.length - 1].toLowerCase()}` : '';

      const name = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}${ext || '.bin'}`;
      const fullPath = path.join(uploadDir, name);
      await fs.writeFile(fullPath, buf);
      return `/uploads/evidence/${taskId}/${name}`;
    }

    for (const f of photosLimited) photoUrls.push(await saveOne(f, 'photo'));
    if (videoFile) videoUrls.push(await saveOne(videoFile, 'video'));
    for (const f of zipFiles) fileUrls.push(await saveOne(f, 'file'));

    // ✅ Create + stop parent countdown atomically
    try {
      const ev = await prisma.$transaction(async (tx) => {
        // re-check in TX
        if (fixForId) {
          const parent = await tx.taskEvidence.findUnique({
            where: { id: fixForId },
            select: {
              id: true,
              taskId: true,
              authorId: true,
              status: true,
              needsFixesAt: true,
            },
          });

          if (!parent) throw new Error('fixfor_not_found');
          if (parent.taskId !== taskId) throw new Error('fixfor_wrong_task');
          if (parent.authorId !== userId) throw new Error('fixfor_not_owner');
          if (parent.status !== 'NEEDS_FIXES') throw new Error('fixfor_not_needs_fixes');

          const already = await tx.taskEvidence.findFirst({
            where: { fixForId },
            select: { id: true },
          });
          if (already) throw new Error('fixfor_already_resubmitted');

          if (!parent.needsFixesAt) throw new Error('fixfor_missing_time');
          const deadline = new Date(parent.needsFixesAt).getTime() + HOURS_96_MS;
          if (Date.now() > deadline) throw new Error('fixfor_expired');
        }

        const created = await tx.taskEvidence.create({
          data: {
            taskId,
            authorId: userId,
            text,
            photos: JSON.stringify(photoUrls),
            videos: JSON.stringify(videoUrls),
            files: JSON.stringify(fileUrls),

            fixForId: fixForId || null,
            autoApproved: false,
            decidedAt: null,
            decidedById: null,
            status: 'PENDING',

            clientSystemSeen: true,
            workerDecisionSeen: true,
            clientSawRatingPrompt: true,
            workerSawRatingPrompt: true,
          },
          select: { id: true },
        });

        if (fixForId) {
          await tx.taskEvidence.update({
            where: { id: fixForId },
            data: {
              needsFixesAt: null, // ✅ stop countdown
              workerDecisionSeen: true,
            },
          });
        }

        return created;
      });

      return NextResponse.json({ ok: true, id: ev.id });
    } catch (e: any) {
      const msg = String(e?.message || '');
      const known = [
        'fixfor_not_found',
        'fixfor_wrong_task',
        'fixfor_not_owner',
        'fixfor_not_needs_fixes',
        'fixfor_already_resubmitted',
        'fixfor_missing_time',
        'fixfor_expired',
      ];
      if (known.includes(msg)) {
        return NextResponse.json({ error: msg }, { status: 409 });
      }
      throw e;
    }
  } catch (err) {
    console.error('evidence_post_error', err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
