import { all, one, run, newId, now, getSetting } from "./db";
import { APP_URL } from "./config";
import { nyParts, formatDay, formatTime12 } from "./time";
import { snippet } from "./text";
import { sendEmail } from "./email";
import { renderDigestEmail } from "./digest-email";

export type DigestRec = {
  id: string; title: string; emoji: string; category: string; author: string; why: string;
  avg: number | null; ratings: number; place: string; cover: string | null; age?: string;
};
export type DigestTalk = { kind: "rec" | "plan"; id: string; title: string; emoji: string; count: number; people: string[]; latest: { name: string; body: string } };
export type DigestPlan = { id: string; title: string; emoji: string; when: string | null; options: number; voters: number; leader: { title: string; votes: number } | null };
export type DigestData = {
  intro: string;
  quiet: boolean;
  stats: { recs: number; comments: number; ratings: number };
  newRecs: DigestRec[];
  moreNew: number;
  talk: DigestTalk[];
  rediscover: DigestRec | null;
  plans: DigestPlan[];
  signoff: string;
};

const pick = <T,>(arr: T[], seed: number) => arr[Math.abs(seed) % arr.length];

function seedFrom(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return h;
}

function ageLabel(iso: string) {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 864e5);
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  if (days < 365) return `${Math.round(days / 30)} months ago`;
  return days < 730 ? "about a year ago" : `${Math.round(days / 365)} years ago`;
}

type Row = { id: string; title: string; emoji: string | null; category: string | null; author: string | null; why: string | null; description: string | null; avg: number | null; ratings: number; city: string | null; state: string | null; cover: string | null; created_at: string };

const REC_SQL = `SELECT r.id, r.title, c.emoji, c.name AS category, u.name AS author, r.why, r.description, r.city, r.state, r.created_at,
  COALESCE(r.image_url, (SELECT '/uploads/' || p.file FROM rec_photos p WHERE p.rec_id = r.id ORDER BY p.sort LIMIT 1)) AS cover,
  (SELECT AVG(stars) FROM ratings WHERE rec_id = r.id) AS avg, (SELECT COUNT(*) FROM ratings WHERE rec_id = r.id) AS ratings
  FROM recs r LEFT JOIN categories c ON c.id = r.category_id LEFT JOIN users u ON u.id = r.created_by`;

const toRec = (r: Row): DigestRec => ({
  id: r.id, title: r.title, emoji: r.emoji || "✨", category: r.category || "Other", author: r.author || "Someone",
  why: snippet(r.why || r.description, 150), avg: r.avg ? Math.round(r.avg * 10) / 10 : null, ratings: Number(r.ratings),
  place: [r.city, r.state].filter(Boolean).join(", "), cover: r.cover,
});

/** Pulls together a week of group activity. Nothing is invented: every line comes from the database. */
export async function buildDigest(periodStart: string, periodEnd: string, issueDate: string): Promise<DigestData> {
  const seed = seedFrom(issueDate);
  const newRows = await all<Row>(`${REC_SQL} WHERE r.created_at >= ? AND r.created_at < ? ORDER BY r.created_at DESC`, [periodStart, periodEnd]);
  const newIds = new Set(newRows.map((r) => r.id));

  const [{ n: comments }, { n: ratings }] = await Promise.all([
    one<{ n: number }>("SELECT (SELECT COUNT(*) FROM comments WHERE created_at >= ?1 AND created_at < ?2) + (SELECT COUNT(*) FROM plan_comments WHERE created_at >= ?1 AND created_at < ?2) AS n", [periodStart, periodEnd]).then((r) => r!),
    one<{ n: number }>("SELECT COUNT(*) AS n FROM ratings WHERE updated_at >= ? AND updated_at < ?", [periodStart, periodEnd]).then((r) => r!),
  ]);

  // Popular discussions: the busiest comment threads this week, on recommendations and plans.
  const recTalk = await all<{ id: string; title: string; emoji: string | null; n: number }>(
    `SELECT r.id, r.title, c.emoji, COUNT(*) AS n FROM comments cm JOIN recs r ON r.id = cm.rec_id LEFT JOIN categories c ON c.id = r.category_id
     WHERE cm.created_at >= ? AND cm.created_at < ? GROUP BY r.id ORDER BY n DESC, MAX(cm.created_at) DESC LIMIT 6`, [periodStart, periodEnd]);
  const planTalk = await all<{ id: string; title: string; emoji: string; n: number }>(
    `SELECT p.id, p.title, p.emoji, COUNT(*) AS n FROM plan_comments pc JOIN plans p ON p.id = pc.plan_id
     WHERE pc.created_at >= ? AND pc.created_at < ? GROUP BY p.id ORDER BY n DESC LIMIT 3`, [periodStart, periodEnd]);
  const talk: DigestTalk[] = [];
  for (const t of [...recTalk.map((x) => ({ ...x, kind: "rec" as const })), ...planTalk.map((x) => ({ ...x, kind: "plan" as const }))].sort((a, b) => b.n - a.n)) {
    // A brand-new rec with a single comment is already covered above; a lively one still earns a spot.
    if (t.kind === "rec" && newIds.has(t.id) && t.n < 3) continue;
    if (Number(t.n) < 2 && talk.length >= 1) continue;
    const table = t.kind === "rec" ? "comments" : "plan_comments";
    const col = t.kind === "rec" ? "rec_id" : "plan_id";
    const people = await all<{ name: string }>(`SELECT DISTINCT u.name FROM ${table} x JOIN users u ON u.id = x.user_id WHERE x.${col} = ? AND x.created_at >= ? AND x.created_at < ?`, [t.id, periodStart, periodEnd]);
    const latest = await one<{ name: string; body: string }>(`SELECT u.name, x.body FROM ${table} x JOIN users u ON u.id = x.user_id WHERE x.${col} = ? ORDER BY x.created_at DESC LIMIT 1`, [t.id]);
    talk.push({ kind: t.kind, id: t.id, title: t.title, emoji: t.emoji || "💬", count: Number(t.n), people: people.map((p) => p.name), latest: { name: latest?.name || "", body: snippet(latest?.body, 160) } });
    if (talk.length >= 3) break;
  }

  // Something older worth rediscovering, skipping anything featured in recent editions.
  const recent = await all<{ data: string }>("SELECT data FROM newsletters ORDER BY issue_date DESC LIMIT 12");
  const featured = new Set<string>();
  for (const n of recent) {
    try {
      const d = JSON.parse(n.data) as DigestData;
      if (d.rediscover) featured.add(d.rediscover.id);
    } catch {}
  }
  const cutoff = new Date(new Date(periodEnd).getTime() - 30 * 864e5).toISOString();
  const candidates = (await all<Row & { interest: number }>(
    `SELECT * FROM (${REC_SQL.replace("AS ratings", "AS ratings, (SELECT COUNT(*) FROM interests WHERE rec_id = r.id) AS interest")} WHERE r.created_at < ?)
     ORDER BY (COALESCE(avg, 3.5) * 2 + interest + MIN(ratings, 4)) DESC LIMIT 15`, [cutoff])).filter((r) => !featured.has(r.id) && !newIds.has(r.id));
  const re = candidates.length ? pick(candidates.slice(0, 6), seed) : null;
  const rediscover = re ? { ...toRec(re), age: ageLabel(re.created_at) } : null;

  // Upcoming plans: open lists with a date ahead, or ones people touched this week.
  const today = issueDate;
  const planRows = await all<{ id: string; title: string; emoji: string; target_date: string | null; options: number; voters: number }>(
    `SELECT p.id, p.title, p.emoji, p.target_date,
      (SELECT COUNT(*) FROM plan_items WHERE plan_id = p.id) AS options,
      (SELECT COUNT(DISTINCT v.user_id) FROM plan_votes v JOIN plan_items i ON i.id = v.item_id WHERE i.plan_id = p.id) AS voters
     FROM plans p WHERE p.status = 'open' AND (p.target_date >= ? OR p.updated_at >= ? OR p.target_date IS NULL)
     ORDER BY p.target_date IS NULL, p.target_date, p.updated_at DESC LIMIT 3`, [today, periodStart]);
  const plans: DigestPlan[] = [];
  for (const p of planRows) {
    const leader = await one<{ title: string; votes: number }>(
      `SELECT r.title, COUNT(v.user_id) AS votes FROM plan_items i JOIN recs r ON r.id = i.rec_id LEFT JOIN plan_votes v ON v.item_id = i.id
       WHERE i.plan_id = ? GROUP BY i.id HAVING votes > 0 ORDER BY votes DESC, i.created_at LIMIT 1`, [p.id]);
    plans.push({ id: p.id, title: p.title, emoji: p.emoji, when: p.target_date ? formatDay(p.target_date) : null, options: Number(p.options), voters: Number(p.voters), leader: leader ? { title: leader.title, votes: Number(leader.votes) } : null });
  }

  const nNew = newRows.length;
  const quiet = nNew === 0 && talk.length === 0;
  const intro = quiet
    ? pick([
        "A quiet week around here. Either everyone stayed in, or the good stuff is still waiting to be mentioned.",
        "Not a peep this week. We'll assume you were all too busy enjoying things to write them down.",
        "The group chat was quiet this week, so here's a little something from the vault instead.",
      ], seed)
    : nNew >= 6
      ? pick([`A big one. ${nNew} new recommendations landed this week, so somebody's been getting out.`, `${nNew} new things worth mentioning this week. You've all been busy.`], seed)
      : nNew > 0
        ? pick([
            `${nNew === 1 ? "One new recommendation" : `${nNew} new recommendations`} this week, plus whatever you were all arguing about in the comments.`,
            `Here's what the group's been into this week. ${nNew === 1 ? "One fresh find" : `${nNew} fresh finds`}, and a few conversations worth catching up on.`,
          ], seed)
        : "No new recommendations this week, but the comments were busy. Here's what you missed.";
  const signoff = pick([
    "Heard something good? Mention it.",
    "Go forth and recommend.",
    "See you next Thursday. Bring snacks (and recommendations).",
    "Remember: if you liked it, it's worth a mention.",
  ], seed + 1);

  return {
    intro, quiet, stats: { recs: nNew, comments: Number(comments), ratings: Number(ratings) },
    newRecs: newRows.slice(0, 8).map(toRec), moreNew: Math.max(0, nNew - 8), talk, rediscover, plans, signoff,
  };
}

export function digestSubject(d: DigestData, issueDate: string) {
  const day = formatDay(issueDate, { month: "short", day: "numeric" });
  if (d.quiet) return `Worth a Mention · ${day}: a quiet week, and one from the vault`;
  const lead = d.newRecs[0];
  if (d.stats.recs > 1 && lead) return `Worth a Mention · ${day}: ${lead.title} and ${d.stats.recs - 1} more`;
  if (lead) return `Worth a Mention · ${day}: ${lead.title}`;
  return `Worth a Mention · ${day}: the week in comments`;
}

async function periodStartFor(periodEnd: string) {
  const last = await one<{ period_end: string }>("SELECT period_end FROM newsletters WHERE is_sample = 0 ORDER BY issue_date DESC LIMIT 1");
  const weekAgo = new Date(new Date(periodEnd).getTime() - 7 * 864e5).toISOString();
  return last && last.period_end > weekAgo ? last.period_end : weekAgo;
}

export async function previewDigest() {
  const end = now();
  const issueDate = nyParts().date;
  const start = await periodStartFor(end);
  const data = await buildDigest(start, end, issueDate);
  return { data, subject: digestSubject(data, issueDate), issueDate, start, end };
}

/** Creates this week's edition (if it doesn't exist yet) and emails it to everyone. */
export async function publishDigest(opts: { issueDate?: string; send?: boolean } = {}) {
  const end = now();
  const issueDate = opts.issueDate || nyParts().date;
  const existing = await one<{ id: string }>("SELECT id FROM newsletters WHERE issue_date = ?", [issueDate]);
  if (existing) return { id: existing.id, created: false, sent: 0 };

  const start = await periodStartFor(end);
  const data = await buildDigest(start, end, issueDate);
  const subject = digestSubject(data, issueDate);
  const edition = Number((await one<{ n: number }>("SELECT COUNT(*) AS n FROM newsletters WHERE is_sample = 0"))!.n) + 1;
  const id = newId();
  try {
    await run("INSERT INTO newsletters (id, edition, issue_date, subject, data, period_start, period_end, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
      id, edition, issueDate, subject, JSON.stringify(data), start, end, now(),
    ]);
  } catch {
    // Another worker beat us to it (unique issue date). Nothing to do.
    return { id: null, created: false, sent: 0 };
  }
  let sent = 0;
  if (opts.send !== false) {
    const people = await all<{ email: string; name: string }>("SELECT email, name FROM users WHERE status = 'active' AND email_digest = 1 AND is_sample = 0");
    for (const p of people) {
      const { html, text } = renderDigestEmail({ data, subject, issueDate, edition, id, recipientName: p.name });
      const r = await sendEmail({ to: p.email, subject, html, text });
      if (r.ok) sent++;
    }
    await run("UPDATE newsletters SET sent_at = ?, sent_count = ? WHERE id = ?", [now(), sent, id]);
  }
  return { id, created: true, sent };
}

export async function sendTestDigest(to: { email: string; name: string }) {
  const p = await previewDigest();
  const { html, text } = renderDigestEmail({ data: p.data, subject: p.subject, issueDate: p.issueDate, edition: 0, id: null, recipientName: to.name });
  return sendEmail({ to: to.email, subject: "[Preview] " + p.subject, html, text });
}

/** Called every few minutes. Publishes on Thursday once the configured New York time has passed. */
export async function maybeRunScheduledDigest() {
  if ((await getSetting("digest_enabled")) !== "1") return { ran: false, reason: "disabled" };
  const ny = nyParts();
  if (ny.weekday !== "Thu") return { ran: false, reason: "not-thursday" };
  const time = (await getSetting("digest_time")) || "08:00";
  if (ny.hhmm < time) return { ran: false, reason: `waiting-until-${time}` };
  const exists = await one("SELECT id FROM newsletters WHERE issue_date = ?", [ny.date]);
  if (exists) return { ran: false, reason: "already-published" };
  const r = await publishDigest({ issueDate: ny.date });
  console.log(`[digest] Published edition for ${ny.date}; emailed ${r.sent} members.`);
  return { ran: true, ...r };
}

export async function nextDigestLabel() {
  const time = (await getSetting("digest_time")) || "08:00";
  return `Thursdays at ${formatTime12(time)} (Eastern)`;
}

export const digestUrl = (id: string) => `${APP_URL}/newsletter/${id}`;
