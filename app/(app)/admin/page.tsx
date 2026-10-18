import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { all, db, getSetting } from "@/lib/db";
import { APP_URL, EMAIL_ENABLED, GOOGLE_ENABLED } from "@/lib/config";
import { categories } from "@/lib/recs";
import { sampleCounts } from "@/lib/sample-data.mjs";
import { Avatar, PageHeader } from "@/components/ui";
import { ConfirmButton } from "@/components/ConfirmButton";
import { CopyButton } from "@/components/CopyButton";
import { formatDate, formatDay, formatTime12, timeAgo } from "@/lib/time";
import * as A from "@/app/actions/admin";

export const metadata = { title: "Group settings" };

const TABS = [["members", "Members"], ["categories", "Categories"], ["newsletter", "Newsletter"], ["content", "Content"]] as const;

export default async function Admin({ searchParams }: { searchParams: Promise<{ tab?: string; msg?: string }> }) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const tab = TABS.some(([k]) => k === sp.tab) ? sp.tab! : "members";

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Founder only" title="Group settings" />
      <div className="no-scrollbar -mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
        {TABS.map(([k, l]) => (
          <Link key={k} href={`/admin?tab=${k}`} className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition ${tab === k ? "border-gold text-ink" : "border-transparent text-mute hover:text-ink"}`}>{l}</Link>
        ))}
      </div>
      {sp.msg && <p className="mb-6 rounded-xl border border-gold/30 bg-gold/[0.07] p-3 text-sm text-gold" role="status">{sp.msg}</p>}
      {!EMAIL_ENABLED && (
        <p className="mb-6 rounded-xl border border-line bg-raised p-3 text-sm text-soft">
          <b className="text-ink">Email isn&apos;t connected yet.</b> Invitations, sign-in links and the newsletter are being written to the server log instead of sent. Add a Resend key to turn email on (see the setup guide).
        </p>
      )}
      {tab === "members" && <Members meId={me.id} />}
      {tab === "categories" && <Categories />}
      {tab === "newsletter" && <Newsletter />}
      {tab === "content" && <Content />}
    </div>
  );
}

async function Members({ meId }: { meId: string }) {
  const [members, invites] = await Promise.all([
    all<{ id: string; name: string; email: string; image: string | null; role: string; status: string; is_sample: number; created_at: string; last_seen_at: string | null; recs: number }>(
      "SELECT u.*, (SELECT COUNT(*) FROM recs WHERE created_by = u.id) AS recs FROM users u ORDER BY u.status, u.is_sample, u.name COLLATE NOCASE"),
    all<{ id: string; email: string; name: string | null; token: string; created_at: string; expires_at: string }>(
      "SELECT * FROM invites WHERE accepted_at IS NULL AND revoked_at IS NULL ORDER BY created_at DESC"),
  ]);
  const active = members.filter((m) => m.status === "active" && !m.is_sample);
  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-1 font-semibold">Invite someone</h2>
        <p className="mb-4 text-sm text-mute">They&apos;ll get an email with a private link. They can join with Google or an email sign-in link.</p>
        <form action={A.inviteMember} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input name="name" placeholder="First name (optional)" className="field" />
          <input name="email" type="email" required placeholder="friend@example.com" className="field" />
          <button className="btn-primary">Send invite</button>
        </form>
      </section>

      {invites.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold">Waiting to join</h2>
          <div className="card divide-y divide-line">
            {invites.map((i) => {
              const expired = i.expires_at < new Date().toISOString();
              return (
                <div key={i.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{i.name || i.email}</p>
                    <p className="truncate text-xs text-mute">{i.name ? `${i.email} · ` : ""}invited {timeAgo(i.created_at)}{expired ? " · expired" : ""}</p>
                  </div>
                  <CopyButton text={`${APP_URL}/join/${i.token}`} label="Copy link" />
                  <form action={A.resendInvite}><input type="hidden" name="id" value={i.id} /><button className="btn-quiet h-8 px-2.5 text-xs">Resend</button></form>
                  <form action={A.revokeInvite}><input type="hidden" name="id" value={i.id} /><button className="btn-quiet h-8 px-2.5 text-xs hover:text-danger">Cancel</button></form>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 font-semibold">Members <span className="text-mute">{active.length}</span></h2>
        <div className="card divide-y divide-line">
          {members.map((m) => (
            <div key={m.id} className={`flex items-center gap-3 p-4 ${m.status !== "active" ? "opacity-50" : ""}`}>
              <Avatar name={m.name} image={m.image} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {m.name} {m.role === "admin" && <span className="ml-1 rounded bg-gold/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-gold">Founder</span>}
                  {m.is_sample ? <span className="ml-1 text-[10px] uppercase text-faint">sample</span> : null}
                </p>
                <p className="truncate text-xs text-mute">{m.email} · {m.recs} recs · {m.last_seen_at ? `last in ${timeAgo(m.last_seen_at)}` : `joined ${formatDate(m.created_at)}`}</p>
              </div>
              {m.id !== meId && m.role !== "admin" && (
                <form action={A.setMemberStatus}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="status" value={m.status === "active" ? "removed" : "active"} />
                  {m.status === "active"
                    ? <ConfirmButton message={`Remove ${m.name}? They'll be signed out and can't get back in. Their posts stay.`} className="btn-quiet h-8 px-2.5 text-xs hover:text-danger">Remove</ConfirmButton>
                    : <button className="btn-quiet h-8 px-2.5 text-xs">Restore</button>}
                </form>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

async function Categories() {
  const cats = await categories(true);
  return (
    <div className="space-y-8">
      <div className="card divide-y divide-line">
        {cats.map((c, i) => (
          <div key={c.id} className={`flex flex-wrap items-center gap-2 p-3 ${c.archived ? "opacity-50" : ""}`}>
            <form action={A.saveCategory} className="flex flex-1 flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={c.id} />
              <input name="emoji" defaultValue={c.emoji} className="field w-14 px-2 text-center" aria-label="Emoji" />
              <input name="name" defaultValue={c.name} className="field min-w-0 flex-1" aria-label="Name" />
              <label className="flex items-center gap-1.5 text-xs text-mute"><input type="checkbox" name="has_location" defaultChecked={Boolean(c.has_location)} className="accent-[#e8b86a]" /> Location</label>
              <button className="btn-ghost h-9 px-3 text-xs">Save</button>
            </form>
            <div className="flex items-center gap-1">
              <form action={A.moveCategory}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="dir" value="up" /><button disabled={i === 0} className="btn-quiet h-9 w-9 p-0" aria-label="Move up">↑</button></form>
              <form action={A.moveCategory}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="dir" value="down" /><button disabled={i === cats.length - 1} className="btn-quiet h-9 w-9 p-0" aria-label="Move down">↓</button></form>
              <form action={A.archiveCategory}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="archived" value={c.archived ? "0" : "1"} /><button className="btn-quiet h-9 px-2.5 text-xs">{c.archived ? "Show" : "Hide"}</button></form>
            </div>
          </div>
        ))}
      </div>
      <section>
        <h2 className="mb-3 font-semibold">Add a category</h2>
        <form action={A.saveCategory} className="flex flex-wrap items-center gap-2">
          <input name="emoji" placeholder="🎲" className="field w-14 px-2 text-center" aria-label="Emoji" />
          <input name="name" required placeholder="Board Games" className="field min-w-0 flex-1" aria-label="Category name" />
          <label className="flex items-center gap-1.5 text-xs text-mute"><input type="checkbox" name="has_location" className="accent-[#e8b86a]" /> Has a location</label>
          <button className="btn-primary">Add</button>
        </form>
        <p className="mt-2 text-xs text-faint">&ldquo;Location&rdquo; shows the address fields and map link on that category&apos;s form.</p>
      </section>
    </div>
  );
}

async function Newsletter() {
  const [time, enabled, recent] = await Promise.all([
    getSetting("digest_time"), getSetting("digest_enabled"),
    all<{ id: string; issue_date: string; sent_count: number; sent_at: string | null; is_sample: number }>("SELECT id, issue_date, sent_count, sent_at, is_sample FROM newsletters ORDER BY issue_date DESC LIMIT 5"),
  ]);
  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-1 font-semibold">Thursday delivery</h2>
        <p className="mb-4 text-sm text-mute">The digest goes out every Thursday, Eastern time. It covers everything since the last edition.</p>
        <form action={A.saveDigestSettings} className="card space-y-4 p-5">
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" name="digest_enabled" defaultChecked={enabled === "1"} className="size-4 accent-[#e8b86a]" />
            Send the newsletter automatically
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="digest_time" className="text-sm text-soft">Thursdays at</label>
            <input id="digest_time" type="time" name="digest_time" defaultValue={time || "08:00"} step={900} className="field w-36" />
            <span className="text-sm text-mute">Eastern (America/New_York)</span>
          </div>
          <button className="btn-primary">Save</button>
          <p className="text-xs text-faint">Currently: {enabled === "1" ? `Thursdays at ${formatTime12(time || "08:00")}` : "paused"}.</p>
        </form>
      </section>
      <section>
        <h2 className="mb-3 font-semibold">Try it out</h2>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/preview" className="btn-ghost">Preview this week&apos;s edition</Link>
          <form action={A.sendDigestTest}><button className="btn-ghost">Email a preview to me</button></form>
          <form action={A.sendDigestNow}><ConfirmButton message="Publish this week's edition now and email it to everyone?" className="btn-ghost">Send to everyone now</ConfirmButton></form>
        </div>
      </section>
      {recent.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold">Recent editions</h2>
          <div className="card divide-y divide-line text-sm">
            {recent.map((n) => (
              <Link key={n.id} href={`/newsletter/${n.id}`} className="flex justify-between p-3.5 hover:bg-raised/50">
                <span>{formatDay(n.issue_date, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</span>
                <span className="text-mute">{n.is_sample ? "sample" : n.sent_at ? `emailed to ${n.sent_count}` : "not emailed"}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

async function Content() {
  const counts = await sampleCounts(await db());
  const hasSamples = counts.recs + counts.plans + counts.newsletters + counts.users > 0;
  return (
    <div className="space-y-10">
      <section className="card p-5">
        <h2 className="font-semibold">Sample content</h2>
        {hasSamples ? (
          <>
            <p className="mt-1 text-sm text-mute">
              The site came with pretend friends and posts so it doesn&apos;t look empty. Right now there are {counts.recs} sample recommendations, {counts.plans} plans, {counts.comments} comments, {counts.newsletters} newsletter editions and {counts.users} sample members. Anything marked <span className="text-soft">Sample</span> goes.
            </p>
            <form action={A.removeSamples} className="mt-4">
              <ConfirmButton message="Remove all sample content? Real posts, members and anything you've added stay put." className="btn-danger">Remove all sample content</ConfirmButton>
            </form>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-mute">No sample content on the site. You can load it to show people around, then remove it again later.</p>
            <form action={A.loadSamples} className="mt-4"><button className="btn-ghost">Load sample content</button></form>
          </>
        )}
      </section>
      <section className="card p-5">
        <h2 className="font-semibold">Editing anyone&apos;s posts</h2>
        <p className="mt-1 text-sm text-mute">As the founder, you&apos;ll see an <span className="text-soft">Edit</span> button on every recommendation and plan, and a <span className="text-soft">Delete</span> link on every comment.</p>
      </section>
      <section className="card p-5 text-sm">
        <h2 className="font-semibold">Sign-in methods</h2>
        <p className="mt-2 text-mute">Google sign-in: <span className={GOOGLE_ENABLED ? "text-vote" : "text-soft"}>{GOOGLE_ENABLED ? "on" : "not set up"}</span></p>
        <p className="text-mute">Email (sign-in links, invites, newsletter): <span className={EMAIL_ENABLED ? "text-vote" : "text-soft"}>{EMAIL_ENABLED ? "on" : "not set up"}</span></p>
      </section>
    </div>
  );
}
