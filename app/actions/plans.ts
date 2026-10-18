"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser, type User } from "@/lib/auth";
import { one, run, newId, now } from "@/lib/db";

async function canManage(me: User, planId: string) {
  const p = await one<{ created_by: string | null }>("SELECT created_by FROM plans WHERE id = ?", [planId]);
  return Boolean(p && (me.role === "admin" || p.created_by === me.id));
}
const touch = (planId: string) => run("UPDATE plans SET updated_at = ? WHERE id = ?", [now(), planId]);

export async function savePlan(f: FormData) {
  const me = await requireUser();
  const id = String(f.get("id") || "");
  const title = String(f.get("title") || "").trim().slice(0, 120);
  if (!title) return;
  const description = String(f.get("description") || "").trim().slice(0, 2000) || null;
  const emoji = String(f.get("emoji") || "🗓️").trim().slice(0, 8) || "🗓️";
  const date = String(f.get("target_date") || "");
  const target = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
  if (id) {
    if (!(await canManage(me, id))) return;
    await run("UPDATE plans SET title = ?, description = ?, emoji = ?, target_date = ?, updated_at = ? WHERE id = ?", [title, description, emoji, target, now(), id]);
    revalidatePath(`/plans/${id}`);
    redirect(`/plans/${id}`);
  }
  const pid = newId();
  await run("INSERT INTO plans (id, title, description, emoji, target_date, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [pid, title, description, emoji, target, me.id, now(), now()]);
  const firstRec = String(f.get("rec") || "");
  if (firstRec) await run("INSERT OR IGNORE INTO plan_items (id, plan_id, rec_id, added_by, created_at) VALUES (?, ?, ?, ?, ?)", [newId(), pid, firstRec, me.id, now()]);
  revalidatePath("/plans");
  redirect(`/plans/${pid}`);
}

export async function deletePlan(f: FormData) {
  const me = await requireUser();
  const id = String(f.get("id"));
  if (!(await canManage(me, id))) return;
  await run("DELETE FROM plans WHERE id = ?", [id]);
  revalidatePath("/plans");
  redirect("/plans");
}

export async function addToPlan(planId: string, recId: string) {
  const me = await requireUser();
  const p = await one("SELECT id FROM plans WHERE id = ?", [planId]);
  if (!p) return { ok: false };
  await run("INSERT OR IGNORE INTO plan_items (id, plan_id, rec_id, added_by, created_at) VALUES (?, ?, ?, ?, ?)", [newId(), planId, recId, me.id, now()]);
  await touch(planId);
  revalidatePath(`/plans/${planId}`);
  revalidatePath(`/r/${recId}`);
  return { ok: true };
}

export async function removeFromPlan(itemId: string) {
  const me = await requireUser();
  const it = await one<{ plan_id: string; added_by: string | null; created_by: string | null }>(
    "SELECT i.plan_id, i.added_by, p.created_by FROM plan_items i JOIN plans p ON p.id = i.plan_id WHERE i.id = ?", [itemId]);
  if (!it || (it.added_by !== me.id && it.created_by !== me.id && me.role !== "admin")) return;
  await run("DELETE FROM plan_items WHERE id = ?", [itemId]);
  await run("UPDATE plans SET decided_item_id = NULL WHERE decided_item_id = ?", [itemId]);
  revalidatePath(`/plans/${it.plan_id}`);
}

export async function toggleVote(itemId: string) {
  const me = await requireUser();
  const it = await one<{ plan_id: string; status: string }>("SELECT i.plan_id, p.status FROM plan_items i JOIN plans p ON p.id = i.plan_id WHERE i.id = ?", [itemId]);
  if (!it || it.status !== "open") return;
  const r = await run("DELETE FROM plan_votes WHERE item_id = ? AND user_id = ?", [itemId, me.id]);
  if (!r.rowsAffected) await run("INSERT INTO plan_votes (item_id, user_id, created_at) VALUES (?, ?, ?)", [itemId, me.id, now()]);
  await touch(it.plan_id);
  revalidatePath(`/plans/${it.plan_id}`);
}

export async function addPlanComment(planId: string, body: string) {
  const me = await requireUser();
  const text = body.trim().slice(0, 4000);
  if (!text) return;
  await run("INSERT INTO plan_comments (id, plan_id, user_id, body, created_at) VALUES (?, ?, ?, ?, ?)", [newId(), planId, me.id, text, now()]);
  await touch(planId);
  revalidatePath(`/plans/${planId}`);
}

export async function deletePlanComment(id: string) {
  const me = await requireUser();
  const c = await one<{ user_id: string; plan_id: string }>("SELECT user_id, plan_id FROM plan_comments WHERE id = ?", [id]);
  if (!c || (c.user_id !== me.id && me.role !== "admin")) return;
  await run("DELETE FROM plan_comments WHERE id = ?", [id]);
  revalidatePath(`/plans/${c.plan_id}`);
}

/** Lock in a pick (which closes voting), or reopen. Anyone in the group can call it. */
export async function decidePlan(planId: string, itemId: string | null) {
  await requireUser();
  if (itemId) await run("UPDATE plans SET status = 'decided', decided_item_id = ?, updated_at = ? WHERE id = ?", [itemId, now(), planId]);
  else await run("UPDATE plans SET status = 'open', decided_item_id = NULL, updated_at = ? WHERE id = ?", [now(), planId]);
  revalidatePath(`/plans/${planId}`);
  revalidatePath("/plans");
}
