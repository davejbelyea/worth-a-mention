import { APP_URL } from "./config";
import { escapeHtml as e } from "./email";
import { formatDay } from "./time";
import type { DigestData, DigestRec } from "./digest";

const C = { bg: "#f7f7f7", card: "#ffffff", line: "#ebebeb", text: "#222222", soft: "#484848", mute: "#717171", gold: "#e5484d" };

function stars(avg: number | null, n: number) {
  if (!avg) return `<span style="color:${C.mute}">Not rated yet</span>`;
  return `<span style="color:${C.gold}">★ ${avg.toFixed(1)}</span> <span style="color:${C.mute}">(${n})</span>`;
}

function recRow(r: DigestRec) {
  const url = `${APP_URL}/r/${r.id}`;
  const thumb = r.cover && /^https?:/.test(r.cover)
    ? `<td width="64" valign="top" style="padding-right:14px;"><img src="${e(r.cover)}" width="64" height="64" alt="" style="display:block;width:64px;height:64px;object-fit:cover;border-radius:10px;border:1px solid ${C.line};"></td>`
    : `<td width="64" valign="top" style="padding-right:14px;"><div style="width:64px;height:64px;border-radius:10px;background:#fdecee;border:1px solid ${C.line};text-align:center;line-height:64px;font-size:28px;">${r.emoji}</div></td>`;
  return `<tr><td style="padding:14px 0;border-top:1px solid ${C.line};"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${thumb}
<td valign="top"><a href="${url}" style="color:${C.text};font-size:16px;font-weight:600;text-decoration:none;">${e(r.title)}</a>
<div style="font-size:12px;color:${C.mute};margin:3px 0 6px;">${r.emoji} ${e(r.category)}${r.place ? ` · ${e(r.place)}` : ""} · from ${e(r.author)}${r.age ? ` · ${e(r.age)}` : ""}</div>
${r.why ? `<div style="font-size:14px;line-height:1.5;color:${C.soft};">“${e(r.why)}”</div>` : ""}
<div style="font-size:12px;margin-top:6px;">${stars(r.avg, r.ratings)}</div></td></tr></table></td></tr>`;
}

function section(title: string, body: string) {
  return `<tr><td style="padding:28px 28px 8px;"><div style="font-weight:700;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${C.gold};margin-bottom:6px;">${title}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${body}</table></td></tr>`;
}

export function renderDigestEmail(o: { data: DigestData; subject: string; issueDate: string; edition: number; id: string | null; recipientName: string }) {
  const d = o.data;
  const first = o.recipientName.split(" ")[0];
  const webUrl = o.id ? `${APP_URL}/newsletter/${o.id}` : `${APP_URL}/newsletter`;
  const parts: string[] = [];

  if (d.newRecs.length) {
    parts.push(section("Fresh this week", d.newRecs.map(recRow).join("") +
      (d.moreNew ? `<tr><td style="padding:12px 0;border-top:1px solid ${C.line};font-size:14px;"><a href="${APP_URL}/browse?sort=new" style="color:${C.gold};text-decoration:none;">Plus ${d.moreNew} more on the site →</a></td></tr>` : "")));
  }
  if (d.talk.length) {
    parts.push(section("Popular discussions", d.talk.map((t) => {
      const url = `${APP_URL}/${t.kind === "rec" ? "r" : "plans"}/${t.id}`;
      return `<tr><td style="padding:14px 0;border-top:1px solid ${C.line};"><a href="${url}" style="color:${C.text};font-size:15px;font-weight:600;text-decoration:none;">${t.emoji} ${e(t.title)}</a>
<div style="font-size:12px;color:${C.mute};margin:3px 0 6px;">${t.count} ${t.count === 1 ? "comment" : "comments"} from ${e(t.people.join(", "))}</div>
${t.latest.body ? `<div style="font-size:14px;line-height:1.5;color:${C.soft};"><b style="color:${C.text};font-weight:600;">${e(t.latest.name.split(" ")[0])}:</b> ${e(t.latest.body)}</div>` : ""}</td></tr>`;
    }).join("")));
  }
  if (d.rediscover) {
    parts.push(section("From the vault", `<tr><td style="padding:0 0 4px;font-size:14px;color:${C.soft};">Worth a second look, in case it slipped through the cracks.</td></tr>${recRow(d.rediscover)}`));
  }
  if (d.plans.length) {
    parts.push(section("Coming up", d.plans.map((p) => `<tr><td style="padding:14px 0;border-top:1px solid ${C.line};"><a href="${APP_URL}/plans/${p.id}" style="color:${C.text};font-size:15px;font-weight:600;text-decoration:none;">${p.emoji} ${e(p.title)}</a>
<div style="font-size:12px;color:${C.mute};margin-top:3px;">${p.when ? `${e(p.when)} · ` : ""}${p.options} ${p.options === 1 ? "option" : "options"} · ${p.voters} ${p.voters === 1 ? "person has" : "people have"} voted</div>
${p.leader ? `<div style="font-size:14px;color:${C.soft};margin-top:6px;">In the lead: <b style="color:${C.text};font-weight:600;">${e(p.leader.title)}</b> with ${p.leader.votes} ${p.leader.votes === 1 ? "vote" : "votes"}</div>` : `<div style="font-size:14px;color:${C.soft};margin-top:6px;">No votes yet. Go break the tie before there is one.</div>`}</td></tr>`).join("")));
  }
  if (d.quiet) {
    parts.push(`<tr><td style="padding:24px 28px 0;"><a href="${APP_URL}/add" style="display:inline-block;background:${C.gold};color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 18px;border-radius:10px;">Add something in ten seconds</a></td></tr>`);
  }

  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width"><meta name="color-scheme" content="light"></head>
<body style="margin:0;background:${C.bg};padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${C.text};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:600px;background:${C.card};border:1px solid ${C.line};border-radius:18px;" cellpadding="0" cellspacing="0">
<tr><td style="padding:28px 28px 0;">
<div style="font-size:12px;color:${C.mute};">${o.edition ? `No. ${o.edition} · ` : ""}${formatDay(o.issueDate, { weekday: "long", month: "long", day: "numeric" })} · <a href="${webUrl}" style="color:${C.mute};">View on the site</a></div>
<div style="font-weight:800;letter-spacing:-0.02em;font-size:28px;color:${C.text};margin:10px 0 4px;">Worth a Mention</div>
<div style="font-size:13px;color:${C.gold};">Good things. Worth remembering.</div>
<p style="font-size:16px;line-height:1.6;color:${C.soft};margin:20px 0 0;">Hi ${e(first)}. ${e(d.intro)}</p>
${d.stats.recs || d.stats.comments || d.stats.ratings ? `<p style="font-size:13px;color:${C.mute};margin:10px 0 0;">${d.stats.recs} new · ${d.stats.comments} comments · ${d.stats.ratings} ratings</p>` : ""}
</td></tr>
${parts.join("")}
<tr><td style="padding:28px;"><div style="border-top:1px solid ${C.line};padding-top:18px;font-size:14px;color:${C.soft};">${e(d.signoff)}</div>
<div style="font-size:12px;color:${C.mute};margin-top:10px;">You're getting this because you're one of the group. <a href="${APP_URL}/me" style="color:${C.mute};">Email settings</a></div></td></tr>
</table></td></tr></table></body></html>`;

  const lines = [`Worth a Mention · ${formatDay(o.issueDate, { month: "long", day: "numeric" })}`, "", `Hi ${first}. ${d.intro}`, ""];
  if (d.newRecs.length) lines.push("FRESH THIS WEEK", ...d.newRecs.map((r) => `- ${r.title} (${r.category}, from ${r.author}) ${APP_URL}/r/${r.id}`), "");
  if (d.talk.length) lines.push("POPULAR DISCUSSIONS", ...d.talk.map((t) => `- ${t.title}: ${t.count} comments ${APP_URL}/${t.kind === "rec" ? "r" : "plans"}/${t.id}`), "");
  if (d.rediscover) lines.push("FROM THE VAULT", `- ${d.rediscover.title} ${APP_URL}/r/${d.rediscover.id}`, "");
  if (d.plans.length) lines.push("COMING UP", ...d.plans.map((p) => `- ${p.title}${p.when ? ` (${p.when})` : ""} ${APP_URL}/plans/${p.id}`), "");
  lines.push(d.signoff, "", `Read it on the site: ${webUrl}`);
  return { html, text: lines.join("\n") };
}
