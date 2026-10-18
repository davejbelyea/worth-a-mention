"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser, type User } from "@/lib/auth";
import { all, one, run, newId, now } from "@/lib/db";
import { cleanUrl, parseTags, titleKey, urlKey, NE_CODES, OTHER_STATES } from "@/lib/text";
import { findSimilar } from "@/lib/recs";
import { deleteUpload, saveUpload } from "@/lib/uploads";

export type SaveState = { error?: string; duplicate?: { id: string; title: string; author: string | null } };

const STATE_CODES = new Set([...NE_CODES, ...OTHER_STATES.map(([c]) => c)]);
const str = (f: FormData, k: string, max = 2000) => {
  const v = String(f.get(k) ?? "").trim();
  return v ? v.slice(0, max) : null;
};

async function canEdit(user: User, recId: string) {
  const r = await one<{ created_by: string | null }>("SELECT created_by FROM recs WHERE id = ?", [recId]);
  return Boolean(r && (user.role === "admin" || r.created_by === user.id));
}

export async function saveRec(_: SaveState, f: FormData): Promise<SaveState> {
  const me = await requireUser();
  const id = str(f, "id");
  const title = str(f, "title", 200);
  if (!title) return { error: "Give it a name. That's the only thing we really need." };
  if (id && !(await canEdit(me, id))) return { error: "Only the person who added this (or the founder) can edit it." };

  const url = cleanUrl(str(f, "url", 1000));
  if (!id && f.get("force") !== "1") {
    const dupe = (await findSimilar(title, url)).find((d) => d.exact);
    if (dupe) return { duplicate: { id: dupe.id, title: dupe.title, author: dupe.author_name } };
  }

  const catSlug = str(f, "category") || "other";
  const cat = await one<{ id: string }>("SELECT id FROM categories WHERE slug = ?", [catSlug]);
  let state = str(f, "state", 4);
  let country = str(f, "country", 60);
  if (state === "INTL") state = null;
  else if (state && STATE_CODES.has(state)) country = "US";
  else state = null;

  const fields = {
    title,
    title_key: titleKey(title),
    category_id: cat?.id ?? null,
    url,
    url_key: urlKey(url),
    image_url: cleanUrl(str(f, "image_url", 1500)),
    site_name: str(f, "site_name", 120),
    description: str(f, "description", 1200),
    why: str(f, "why", 3000),
    place_name: str(f, "place_name", 160),
    address: str(f, "address", 240),
    city: str(f, "city", 80),
    state,
    country: state ? "US" : country,
  };

  const recId = id || newId();
  const ts = now();
  if (id) {
    const sets = Object.keys(fields).map((k) => `${k} = ?`).join(", ");
    await run(`UPDATE recs SET ${sets}, updated_at = ? WHERE id = ?`, [...Object.values(fields), ts, id]);
  } else {
    const keys = Object.keys(fields);
    await run(`INSERT INTO recs (id, ${keys.join(", ")}, created_by, created_at, updated_at) VALUES (?, ${keys.map(() => "?").join(", ")}, ?, ?, ?)`, [
      recId, ...Object.values(fields), me.id, ts, ts,
    ]);
  }

  // Tags
  await run("DELETE FROM rec_tags WHERE rec_id = ?", [recId]);
  for (const t of parseTags(str(f, "tags", 600))) await run("INSERT OR IGNORE INTO rec_tags (rec_id, tag) VALUES (?, ?)", [recId, t]);

  // Extra links
  await run("DELETE FROM rec_links WHERE rec_id = ?", [recId]);
  for (const raw of f.getAll("link")) {
    const u = cleanUrl(String(raw));
    if (u && u !== url) await run("INSERT INTO rec_links (id, rec_id, url) VALUES (?, ?, ?)", [newId(), recId, u]);
  }

  // Photos
  for (const pid of f.getAll("remove_photo").map(String)) {
    const p = await one<{ file: string }>("SELECT file FROM rec_photos WHERE id = ? AND rec_id = ?", [pid, recId]);
    if (p) {
      await run("DELETE FROM rec_photos WHERE id = ?", [pid]);
      await deleteUpload(p.file);
    }
  }
  let sort = Number((await one<{ n: number }>("SELECT COUNT(*) AS n FROM rec_photos WHERE rec_id = ?", [recId]))?.n ?? 0);
  for (const file of f.getAll("photos")) {
    if (!(file instanceof File) || !file.size) continue;
    const name = await saveUpload(file);
    if (name) await run("INSERT INTO rec_photos (id, rec_id, file, added_by, sort, created_at) VALUES (?, ?, ?, ?, ?, ?)", [newId(), recId, name, me.id, sort++, ts]);
  }

  // Adding something usually means you vouch for it: an optional rating at creation time.
  const stars = Number(f.get("stars"));
  if (!id && stars >= 1 && stars <= 5) await run("INSERT OR REPLACE INTO ratings (rec_id, user_id, stars, updated_at) VALUES (?, ?, ?, ?)", [recId, me.id, stars, ts]);

  revalidatePath("/", "layout");
  redirect(`/r/${recId}${id ? "" : "?added=1"}`);
}

export async function deleteRec(f: FormData) {
  const me = await requireUser();
  const id = String(f.get("id"));
  if (!(await canEdit(me, id))) return;
  const photos = await all<{ file: string }>("SELECT file FROM rec_photos WHERE rec_id = ?", [id]);
  await run("DELETE FROM recs WHERE id = ?", [id]);
  for (const p of photos) await deleteUpload(p.file);
  revalidatePath("/", "layout");
  redirect("/?deleted=1");
}

export async function rate(recId: string, stars: number) {
  const me = await requireUser();
  if (stars === 0) await run("DELETE FROM ratings WHERE rec_id = ? AND user_id = ?", [recId, me.id]);
  else if (stars >= 1 && stars <= 5) {
    await run("INSERT INTO ratings (rec_id, user_id, stars, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(rec_id, user_id) DO UPDATE SET stars = excluded.stars, updated_at = excluded.updated_at", [recId, me.id, Math.round(stars), now()]);
  }
  revalidatePath(`/r/${recId}`);
}

export async function toggleInterest(recId: string) {
  const me = await requireUser();
  const r = await run("DELETE FROM interests WHERE rec_id = ? AND user_id = ?", [recId, me.id]);
  if (!r.rowsAffected) await run("INSERT INTO interests (rec_id, user_id, created_at) VALUES (?, ?, ?)", [recId, me.id, now()]);
  revalidatePath(`/r/${recId}`);
}

export async function addComment(recId: string, body: string) {
  const me = await requireUser();
  const text = body.trim().slice(0, 4000);
  if (!text) return;
  await run("INSERT INTO comments (id, rec_id, user_id, body, created_at) VALUES (?, ?, ?, ?, ?)", [newId(), recId, me.id, text, now()]);
  revalidatePath(`/r/${recId}`);
}

export async function editComment(commentId: string, body: string) {
  const me = await requireUser();
  const c = await one<{ user_id: string; rec_id: string }>("SELECT user_id, rec_id FROM comments WHERE id = ?", [commentId]);
  if (!c || (c.user_id !== me.id && me.role !== "admin") || !body.trim()) return;
  await run("UPDATE comments SET body = ?, edited_at = ? WHERE id = ?", [body.trim().slice(0, 4000), now(), commentId]);
  revalidatePath(`/r/${c.rec_id}`);
}

export async function deleteComment(commentId: string) {
  const me = await requireUser();
  const c = await one<{ user_id: string; rec_id: string }>("SELECT user_id, rec_id FROM comments WHERE id = ?", [commentId]);
  if (!c || (c.user_id !== me.id && me.role !== "admin")) return;
  await run("DELETE FROM comments WHERE id = ?", [commentId]);
  revalidatePath(`/r/${c.rec_id}`);
}
