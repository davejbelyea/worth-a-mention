import fs from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "@/lib/auth";
import { UPLOAD_DIR } from "@/lib/db";
import { MIME } from "@/lib/uploads";

// Photos are private too: only signed-in members can load them.
export async function GET(_: Request, { params }: { params: Promise<{ file: string }> }) {
  if (!(await getCurrentUser())) return new Response("Not found", { status: 404 });
  const { file } = await params;
  if (!/^[\w-]+\.\w+$/.test(file)) return new Response("Not found", { status: 404 });
  try {
    const buf = await fs.readFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, file));
    return new Response(new Uint8Array(buf), {
      headers: { "Content-Type": MIME[file.split(".").pop()!] || "application/octet-stream", "Cache-Control": "private, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
