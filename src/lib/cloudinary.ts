// lib/cloudinary.ts
import { v2 as cloudinary } from "cloudinary";

// ───────────────────────────────
// Config
// ───────────────────────────────
const CLOUDINARY_URL = process.env.CLOUDINARY_URL;
if (!CLOUDINARY_URL) {
  throw new Error("CLOUDINARY_URL is missing");
}

// ✅ აქ ვუძლებთ SDK-ს სრულ URL-ს, რომ cloud_name/api_key/api_secret 100%-ით აიწყოს
cloudinary.config({
  cloudinary_url: CLOUDINARY_URL,
  secure: true,
});

// Client-ს რომ გადაეცეს მხოლოდ public მონაცემები
export const cloudPublic = {
  cloudName: cloudinary.config().cloud_name!,
  apiKey: cloudinary.config().api_key!,
};

// ───────────────────────────────
// Folders
// ───────────────────────────────
const ASSETS_ROOT = process.env.CLOUDINARY_ASSETS_ROOT || "tasky";

export const FOLDER_MAP = {
  task: `${ASSETS_ROOT}/tasks`,
  avatar: `${ASSETS_ROOT}/avatars`,
  evidence: `${ASSETS_ROOT}/evidences`,
} as const;

export type UploadKind = keyof typeof FOLDER_MAP;

export function resolveFolder(kind: UploadKind): string {
  return FOLDER_MAP[kind];
}

// ───────────────────────────────
// Server-side signing helpers
// ───────────────────────────────
export function signForFolder(folder: string) {
  const timestamp = Math.floor(Date.now() / 1000);
  const apiSecret = cloudinary.config().api_secret;
  if (!apiSecret) {
    throw new Error("Cloudinary secret is missing. Check CLOUDINARY_URL.");
  }

  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    apiSecret
  );

  return { signature, timestamp, folder };
}

export function signUpload(params: { folder: string; timestamp: number }) {
  const apiSecret = cloudinary.config().api_secret!;
  const signature = cloudinary.utils.api_sign_request(
    { folder: params.folder, timestamp: params.timestamp },
    apiSecret
  );
  return { signature };
}

export default cloudinary;
