// app/api/cloudinary/sign/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';

type Parts = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

function fromCloudinaryUrl(url?: string | null): Parts | null {
  if (!url) return null;
  // ფორმატი: cloudinary://API_KEY:API_SECRET@CLOUD_NAME
  try {
    const u = new URL(url);
    if (u.protocol !== 'cloudinary:') return null;
    const apiKey = decodeURIComponent(u.username);
    const apiSecret = decodeURIComponent(u.password);
    const cloudName = u.hostname;
    if (!apiKey || !apiSecret || !cloudName) return null;
    return { cloudName, apiKey, apiSecret };
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = (url.searchParams.get('type') || 'image') as 'image' | 'video' | 'raw';
  const folder = url.searchParams.get('folder') || 'tasky/evidences';

  // 1) ვცდილობთ წავიკითხოთ ცალკე env-ები
  let cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
  let apiKey    = process.env.CLOUDINARY_API_KEY || '';
  let apiSecret = process.env.CLOUDINARY_API_SECRET || '';

  // 2) თუ რომელიმე აკლია, ვცდილობთ ამოვკრიფოთ CLOUDINARY_URL-იდან
  if (!cloudName || !apiKey || !apiSecret) {
    const fromUrl = fromCloudinaryUrl(process.env.CLOUDINARY_URL);
    if (fromUrl) {
      cloudName = cloudName || fromUrl.cloudName;
      apiKey    = apiKey    || fromUrl.apiKey;
      apiSecret = apiSecret || fromUrl.apiSecret;
    }
  }

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: 'Cloudinary env missing (set CLOUDINARY_URL or the 3 separate vars)' },
      { status: 500 }
    );
  }

  const timestamp = Math.floor(Date.now() / 1000);

  // რასაც ვაწერავთ ხელმოწერაში იგივესვე ვაგზავნით upload-ზე:
  // აქ მარტო folder და timestamp გვჭირდება
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash('sha1')
    .update(paramsToSign + apiSecret)
    .digest('hex');

  return NextResponse.json({
    cloudName,
    apiKey,
    timestamp,
    signature,
    folder,
    resourceType: type === 'video' ? 'video' : type === 'raw' ? 'raw' : 'image',
  });
}
