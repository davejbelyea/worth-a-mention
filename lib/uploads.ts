import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { UPLOAD_DIR } from "./db";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/heic": "heic", "image/avif": "avif" };
export const MIME: Record<string, string> = Object.fromEntries(Object.entries(TYPES).map(([k, v]) => [v, k]));

export async function saveUpload(file: File): Promise<string | null> {
  if (!file || !file.size) return null;
  const ext = TYPES[file.type];
  if (!ext || file.size > 12 * 1024 * 1024) return null;
  const name = `${crypto.randomBytes(12).toString("base64url")}.${ext}`;
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  return name;
}

export async function deleteUpload(name: string) {
  if (!/^[\w-]+\.\w+$/.test(name)) return;
  await fs.rm(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name), { force: true });
}
