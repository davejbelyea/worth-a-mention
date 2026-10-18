import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "./db";
import { EMAIL_ENABLED } from "./config";

export type Email = { to: string; subject: string; html: string; text: string };

/**
 * Sends through Resend when RESEND_API_KEY is set. Otherwise the email is
 * written to data/outbox and printed to the server log, so nothing is lost
 * while you are setting things up.
 */
export async function sendEmail(msg: Email): Promise<{ ok: boolean; error?: string }> {
  if (!EMAIL_ENABLED) {
    const dir = path.join(/*turbopackIgnore: true*/ DATA_DIR, "outbox");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${Date.now()}-${msg.to.replace(/[^a-z0-9@.]/gi, "_")}.html`);
    fs.writeFileSync(file, `<!-- To: ${msg.to}\nSubject: ${msg.subject} -->\n${msg.html}`);
    console.log(`\n[email not configured] To: ${msg.to}\nSubject: ${msg.subject}\n${msg.text}\n(saved to ${file})\n`);
    return { ok: true };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Worth a Mention <onboarding@resend.dev>",
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("Resend error", res.status, body);
      return { ok: false, error: body };
    }
    return { ok: true };
  } catch (e) {
    console.error("Email send failed", e);
    return { ok: false, error: String(e) };
  }
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** A simple, dark-friendly wrapper used for sign-in and invitation emails. */
export function simpleEmail(opts: { heading: string; body: string; button: string; url: string; footer?: string }) {
  const html = `<!doctype html><html><body style="margin:0;background:#f7f7f7;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border:1px solid #ebebeb;border-radius:16px;" cellpadding="0" cellspacing="0">
<tr><td style="padding:32px 28px;color:#222222;">
<div style="font-weight:800;font-size:16px;color:#e5484d;margin-bottom:20px;">Worth a Mention</div>
<h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;font-weight:600;color:#222222;">${opts.heading}</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#484848;">${opts.body}</p>
<a href="${opts.url}" style="display:inline-block;background:#e5484d;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 20px;border-radius:10px;">${opts.button}</a>
<p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#717171;">${opts.footer ?? "If the button doesn't work, paste this into your browser:"}<br><span style="color:#484848;word-break:break-all;">${opts.url}</span></p>
</td></tr></table>
<p style="font-size:12px;color:#a3a3a3;margin-top:16px;">Good things. Worth remembering.</p>
</td></tr></table></body></html>`;
  return html;
}
