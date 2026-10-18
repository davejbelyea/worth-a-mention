"use server";
import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, sendInviteEmail } from "@/lib/auth";
import { all, db, one, run, newId, now, setSetting } from "@/lib/db";
import { publishDigest, sendTestDigest } from "@/lib/digest";
import { loadSampleData, removeSampleData } from "@/lib/sample-data.mjs";
import { nyParts } from "@/lib/time";

const back = (tab: string, msg?: string) => redirect(`/admin?tab=${tab}${msg ? `&msg=${encodeURIComponent(msg)}` : ""}`);

export async function inviteMember(f: FormData) {
  const me = await requireAdmin();
  const email = String(f.get("email") || "").trim().toLowerCase();
  const name = String(f.get("name") || "").trim() || null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) back("members", "That email doesn't look right.");
  const existing = await one<{ status: string }>("SELECT status FROM users WHERE email = ?", [email]);
  if (existing?.status === "active") back("members", `${email} is already a member.`);
  await run("UPDATE invites SET revoked_at = ? WHERE email = ? AND accepted_at IS NULL AND revoked_at IS NULL", [now(), email]);
  const token = crypto.randomBytes(24).toString("base64url");
  await run("INSERT INTO invites (id, email, name, token, invited_by, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)", [
    newId(), email, name, token, me.id, now(), new Date(Date.now() + 14 * 864e5).toISOString(),
  ]);
  if (existing) await run("UPDATE users SET status = 'active' WHERE email = ?", [email]);
  const r = await sendInviteEmail({ email, name, token }, me.name);
  revalidatePath("/admin");
  back("members", r.ok ? `Invite sent to ${email}.` : `Invite created, but the email didn't send. Copy the link below and send it yourself.`);
}

export async function resendInvite(f: FormData) {
  const me = await requireAdmin();
  const inv = await one<{ email: string; name: string | null; token: string }>("SELECT * FROM invites WHERE id = ?", [String(f.get("id"))]);
  if (!inv) return;
  await run("UPDATE invites SET expires_at = ? WHERE id = ?", [new Date(Date.now() + 14 * 864e5).toISOString(), String(f.get("id"))]);
  await sendInviteEmail(inv, me.name);
  back("members", `Sent another invite to ${inv.email}.`);
}

export async function revokeInvite(f: FormData) {
  await requireAdmin();
  await run("UPDATE invites SET revoked_at = ? WHERE id = ?", [now(), String(f.get("id"))]);
  back("members", "Invite cancelled.");
}

export async function setMemberStatus(f: FormData) {
  const me = await requireAdmin();
  const id = String(f.get("id"));
  const status = f.get("status") === "removed" ? "removed" : "active";
  if (id === me.id) back("members", "You can't remove yourself.");
  await run("UPDATE users SET status = ? WHERE id = ?", [status, id]);
  if (status === "removed") await run("DELETE FROM sessions WHERE user_id = ?", [id]);
  back("members", status === "removed" ? "Member removed. Their posts stay up with their name on them." : "Member restored.");
}

export async function saveCategory(f: FormData) {
  await requireAdmin();
  const id = String(f.get("id") || "");
  const name = String(f.get("name") || "").trim().slice(0, 40);
  const emoji = String(f.get("emoji") || "✨").trim().slice(0, 8) || "✨";
  const hasLoc = f.get("has_location") ? 1 : 0;
  if (!name) back("categories");
  if (id) {
    await run("UPDATE categories SET name = ?, emoji = ?, has_location = ? WHERE id = ?", [name, emoji, hasLoc, id]);
  } else {
    let slug = name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "cat";
    if (await one("SELECT id FROM categories WHERE slug = ?", [slug])) slug += "-" + crypto.randomBytes(2).toString("hex");
    const max = await one<{ m: number }>("SELECT COALESCE(MAX(sort), 0) AS m FROM categories");
    await run("INSERT INTO categories (id, slug, name, emoji, sort, has_location) VALUES (?, ?, ?, ?, ?, ?)", [newId(), slug, name, emoji, Number(max?.m) + 1, hasLoc]);
  }
  revalidatePath("/", "layout");
  back("categories", "Categories updated.");
}

export async function moveCategory(f: FormData) {
  await requireAdmin();
  const id = String(f.get("id"));
  const dir = f.get("dir") === "up" ? -1 : 1;
  const cats = await all<{ id: string }>("SELECT id FROM categories ORDER BY sort, name");
  const i = cats.findIndex((c) => c.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= cats.length) back("categories");
  [cats[i], cats[j]] = [cats[j], cats[i]];
  for (let k = 0; k < cats.length; k++) await run("UPDATE categories SET sort = ? WHERE id = ?", [k, cats[k].id]);
  revalidatePath("/", "layout");
  back("categories");
}

export async function archiveCategory(f: FormData) {
  await requireAdmin();
  await run("UPDATE categories SET archived = ? WHERE id = ?", [f.get("archived") === "1" ? 1 : 0, String(f.get("id"))]);
  revalidatePath("/", "layout");
  back("categories", f.get("archived") === "1" ? "Category hidden. Existing recommendations keep it." : "Category is back.");
}

export async function saveDigestSettings(f: FormData) {
  await requireAdmin();
  const time = String(f.get("digest_time") || "08:00");
  if (/^\d{2}:\d{2}$/.test(time)) await setSetting("digest_time", time);
  await setSetting("digest_enabled", f.get("digest_enabled") ? "1" : "0");
  back("newsletter", "Newsletter settings saved.");
}

export async function sendDigestNow() {
  await requireAdmin();
  const today = nyParts().date;
  if (await one("SELECT id FROM newsletters WHERE issue_date = ?", [today])) back("newsletter", "Today's edition already went out. Only one per day.");
  const r = await publishDigest({ issueDate: today });
  revalidatePath("/newsletter");
  back("newsletter", `Published and emailed to ${r.sent} ${r.sent === 1 ? "member" : "members"}.`);
}

export async function sendDigestTest() {
  const me = await requireAdmin();
  const r = await sendTestDigest(me);
  back("newsletter", r.ok ? `Preview sent to ${me.email}.` : "The preview email didn't send. Check your email settings.");
}

export async function removeSamples() {
  await requireAdmin();
  const n = await removeSampleData(await db());
  revalidatePath("/", "layout");
  back("content", `Sample content removed (${n} items). It's all yours now.`);
}

export async function loadSamples() {
  const me = await requireAdmin();
  await loadSampleData(await db(), { ownerId: me.id });
  revalidatePath("/", "layout");
  back("content", "Sample content loaded.");
}
