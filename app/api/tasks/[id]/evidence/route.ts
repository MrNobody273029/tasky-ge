// app/api/tasks/[id]/evidence/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureUserFromReq } from '@/lib/auth';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await ensureUserFromReq(req);
    if (!user) {
      return NextResponse.json({ error: 'auth_required' }, { status: 401 });
    }

    const task = await prisma.task.findUnique({
      where: { id: params.id },
      select: { id: true, authorId: true },
    });
    if (!task) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    const taskId = task.id;
    const form = await req.formData();
    const rawText = (form.get('text') ?? '').toString();
    const text = rawText.trim();

    // ფოტოების მიღება (max 6)
    const photoEntries = form.getAll('photos');
    const photoFiles = photoEntries.filter(
      (v): v is File => v instanceof File && v.size > 0
    );
    const photosLimited = photoFiles.slice(0, 6);

    // ვიდეო (max 1 UI-ს მხრივ, ბექზე მაინც array)
    const videoRaw = form.get('video');
    const videoFile =
      videoRaw instanceof File && videoRaw.size > 0 ? videoRaw : null;

    // ZIP / სხვა ფაილები
    const fileEntries = form.getAll('files');
    const zipFiles = fileEntries.filter(
      (v): v is File => v instanceof File && v.size > 0
    );

    const hasSomething =
      text.length > 0 ||
      photosLimited.length > 0 ||
      !!videoFile ||
      zipFiles.length > 0;

    if (!hasSomething) {
      return NextResponse.json(
        { error: 'empty_evidence' },
        { status: 400 }
      );
    }

// ---- ფაილების შენახვა (dev: public/uploads/evidence/{taskId}/...) ----
const uploadDir = path.join(
  process.cwd(),
  'public',
  'uploads',
  'evidence',
  taskId,            // აქ task.id-ს მაგივრად taskId
);

await fs.mkdir(uploadDir, { recursive: true });

const photoUrls: string[] = [];
const videoUrls: string[] = [];
const fileUrls: string[] = [];

async function saveOne(file: File, prefix: string): Promise<string> {
  const arrayBuf = await file.arrayBuffer();
  const buf = Buffer.from(arrayBuf);

  const orig = file.name || 'file';
  const parts = orig.split('.');
  const ext =
    parts.length > 1 ? `.${parts[parts.length - 1].toLowerCase()}` : '';

  const name = `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}${ext || '.bin'}`;

  const fullPath = path.join(uploadDir, name);
  await fs.writeFile(fullPath, buf);

  // PUBLIC URL
  return `/uploads/evidence/${taskId}/${name}`; // აქაც taskId
}


    for (const f of photosLimited) {
      const url = await saveOne(f, 'photo');
      photoUrls.push(url);
    }

    if (videoFile) {
      const url = await saveOne(videoFile, 'video');
      videoUrls.push(url);
    }

    for (const f of zipFiles) {
      const url = await saveOne(f, 'file');
      fileUrls.push(url);
    }

    const ev = await prisma.taskEvidence.create({
      data: {
        taskId: task.id,
        authorId: user.id,
        text,
        photos: JSON.stringify(photoUrls),
        videos: JSON.stringify(videoUrls),
        files: JSON.stringify(fileUrls),
      },
    });

    return NextResponse.json({ ok: true, id: ev.id });
  } catch (err) {
    console.error('evidence_post_error', err);
    return NextResponse.json(
      { error: 'server_error' },
      { status: 500 }
    );
  }
}
