import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { all, one, run, newId, now } from "./db";
import { ADMIN_EMAIL, APP_URL } from "./config";
import { sendEmail, simpleEmail, escapeHtml } from "./email";

export const SESSION_COOKIE = "wam_session";
const SESSION_DAYS = 60;

export type User = {
  id: string;
  email: string;
  name: string;
  image: string | null;
  role: "admin" | "member";
  status: string;
  email_digest: number;
  is_sample: number;
};

export const hash = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
const token = () => crypto.randomBytes(32).toString("base64url");
const secureCookies = APP_URL.startsWith("https://");

export async function createSession(userId: string) {
  const t = token();
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  await run("INSERT INTO sessions (id_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)", [hash(t), userId, now(), expires.toISOString()]);
  await run("UPDATE users SET last_seen_at = ? WHERE id = ?", [now(), userId]);
  (await cookies()).set(SESSION_COOKIE, t, { httpOnly: true, sameSite: "lax", secure: secureCookies, path: "/", expires });
}

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const t = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!t) return null;
  const u = await one<User & { expires_at: string }>(
    `SELECT u.*, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id_hash = ? AND u.status = 'active'`,
    [hash(t)],
  );
  if (!u || u.expires_at < now()) return null;
  // The founder's email is always the administrator.
  if (ADMIN_EMAIL && u.email.toLowerCase() === ADMIN_EMAIL && u.role !== "admin") {
    await run("UPDATE users SET role = 'admin' WHERE id = ?", [u.id]);
    u.role = "admin";
  }
  return u;
});

export async function requireUser(): Promise<User> {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  return u;
}

export async function requireAdmin(): Promise<User> {
  const u = await requireUser();
  if (u.role !== "admin") redirect("/");
  return u;
}

export async function signOut() {
  const jar = await cookies();
  const t = jar.get(SESSION_COOKIE)?.value;
  if (t) await run("DELETE FROM sessions WHERE id_hash = ?", [hash(t)]);
  jar.delete(SESSION_COOKIE);
}

type Invite = { id: string; email: string; name: string | null; token: string; expires_at: string; accepted_at: string | null; revoked_at: string | null; invited_by: string | null };

export async function findOpenInvite(tok: string): Promise<(Invite & { inviter_name: string | null }) | undefined> {
  const inv = await one<Invite & { inviter_name: string | null }>(
    `SELECT i.*, u.name AS inviter_name FROM invites i LEFT JOIN users u ON u.id = i.invited_by WHERE i.token = ?`,
    [tok],
  );
  if (!inv || inv.revoked_at || inv.accepted_at || inv.expires_at < now()) return undefined;
  return inv;
}

/** Is this email allowed to sign in (existing member, pending invite, or the founder)? */
export async function emailAllowed(email: string): Promise<boolean> {
  email = email.trim().toLowerCase();
  if (ADMIN_EMAIL && email === ADMIN_EMAIL) return true;
  const u = await one<{ status: string }>("SELECT status FROM users WHERE email = ?", [email]);
  if (u) return u.status === "active";
  const inv = await one("SELECT id FROM invites WHERE email = ? AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > ?", [email, now()]);
  return Boolean(inv);
}

/**
 * Finds or creates the member for a verified email. New people need a valid
 * invite (or to be the founder). Holding an invite link counts as an invite
 * even if they sign in with a different Google address than the one invited.
 */
export async function completeSignIn(opts: { email: string; name?: string | null; image?: string | null; inviteToken?: string | null }): Promise<{ user?: User; error?: string; created?: boolean }> {
  const email = opts.email.trim().toLowerCase();
  const existing = await one<User>("SELECT * FROM users WHERE email = ?", [email]);
  if (existing) {
    if (existing.status !== "active") return { error: "removed" };
    if (opts.image && !existing.image) await run("UPDATE users SET image = ? WHERE id = ?", [opts.image, existing.id]);
    if (opts.inviteToken) await run("UPDATE invites SET accepted_at = ? WHERE token = ? AND accepted_at IS NULL", [now(), opts.inviteToken]);
    return { user: existing };
  }

  let invite: Invite | undefined;
  if (opts.inviteToken) invite = await findOpenInvite(opts.inviteToken);
  if (!invite) {
    invite = await one<Invite>(
      "SELECT * FROM invites WHERE email = ? AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > ? ORDER BY created_at DESC",
      [email, now()],
    );
  }
  const isFounder = Boolean(ADMIN_EMAIL && email === ADMIN_EMAIL);
  if (!invite && !isFounder) return { error: "not-invited" };

  const id = newId();
  const fallback = email.split("@")[0].split(/[._+-]/)[0];
  const name = (opts.name || invite?.name || fallback.charAt(0).toUpperCase() + fallback.slice(1)).trim();
  await run(
    "INSERT INTO users (id, email, name, image, role, status, created_at) VALUES (?, ?, ?, ?, ?, 'active', ?)",
    [id, email, name, opts.image ?? null, isFounder ? "admin" : "member", now()],
  );
  if (invite) await run("UPDATE invites SET accepted_at = ? WHERE id = ?", [now(), invite.id]);
  return { user: (await one<User>("SELECT * FROM users WHERE id = ?", [id]))!, created: true };
}

export async function sendMagicLink(email: string, nextPath?: string | null, inviteToken?: string | null): Promise<{ ok: boolean; reason?: string; devLink?: string }> {
  email = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, reason: "invalid" };
  const invite = inviteToken ? await findOpenInvite(inviteToken) : undefined;
  if (!invite && !(await emailAllowed(email))) return { ok: false, reason: "not-invited" };
  const recent = await one<{ n: number }>("SELECT COUNT(*) AS n FROM login_tokens WHERE email = ? AND created_at > ?", [email, new Date(Date.now() - 36e5).toISOString()]);
  if (Number(recent?.n) >= 6) return { ok: false, reason: "too-many" };

  const t = token();
  await run("INSERT INTO login_tokens (token_hash, email, next_path, invite_token, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)", [
    hash(t), email, safeNext(nextPath), invite?.token ?? null, now(), new Date(Date.now() + 20 * 60e3).toISOString(),
  ]);
  const url = `${APP_URL}/auth/verify?token=${t}`;
  await sendEmail({
    to: email,
    subject: "Your sign-in link for Worth a Mention",
    html: simpleEmail({ heading: "Come on in.", body: "Tap the button to sign in. The link works once and expires in 20 minutes.", button: "Sign in to Worth a Mention", url }),
    text: `Sign in to Worth a Mention: ${url}\n\nThe link works once and expires in 20 minutes.`,
  });
  return { ok: true, devLink: process.env.RESEND_API_KEY ? undefined : url };
}

export async function consumeMagicLink(t: string): Promise<{ email?: string; next?: string | null; invite?: string | null }> {
  const row = await one<{ email: string; expires_at: string; used_at: string | null; next_path: string | null; invite_token: string | null }>("SELECT * FROM login_tokens WHERE token_hash = ?", [hash(t)]);
  if (!row || row.used_at || row.expires_at < now()) return {};
  await run("UPDATE login_tokens SET used_at = ? WHERE token_hash = ?", [now(), hash(t)]);
  return { email: row.email, next: row.next_path, invite: row.invite_token };
}

export function safeNext(p?: string | null) {
  if (!p || !p.startsWith("/") || p.startsWith("//")) return null;
  return p;
}

export async function sendInviteEmail(inv: { email: string; name?: string | null; token: string }, inviterName: string) {
  const url = `${APP_URL}/join/${inv.token}`;
  const hi = inv.name ? `${escapeHtml(inv.name)}, ` : "";
  return sendEmail({
    to: inv.email,
    subject: `${inviterName} saved you a seat at Worth a Mention`,
    html: simpleEmail({
      heading: `${hi}you're on the list.`,
      body: `${escapeHtml(inviterName)} invited you to Worth a Mention, the private spot where the group keeps all the good stuff that comes up in conversation. Restaurants, shows, recipes, trips. The things you swore you'd remember.`,
      button: "Accept the invite",
      url,
      footer: "This invite is just for you and expires in 14 days. Link not working? Paste this in your browser:",
    }),
    text: `${inviterName} invited you to Worth a Mention.\n\nAccept: ${url}\n\nThis invite expires in 14 days.`,
  });
}

export async function activeMembers() {
  return all<User>("SELECT * FROM users WHERE status = 'active' ORDER BY name COLLATE NOCASE");
}
