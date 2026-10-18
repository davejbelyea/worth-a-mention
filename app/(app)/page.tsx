import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { all, one } from "@/lib/db";
import { categories, listRecs } from "@/lib/recs";
import { RecGrid, RecRow } from "@/components/RecCard";
import { CategoryChips } from "@/components/CategoryChips";
import { Avatar, Empty, SampleBadge } from "@/components/ui";
import { snippet } from "@/lib/text";
import { formatDay, timeAgo, nyParts } from "@/lib/time";

function greeting(name: string) {
  const h = Number(nyParts().hhmm.slice(0, 2));
  const part = h < 5 ? "Up late" : h < 12 ? "Morning" : h < 17 ? "Afternoon" : "Evening";
  return `${part}, ${name.split(" ")[0]}.`;
}

const SUBS = [
  "Here's what the group has been talking up.",
  "The good stuff, minus the \"wait, what was it called?\"",
  "Everything your friends swore you'd love.",
  "Fresh finds from people with taste (allegedly).",
];

export default async function Home({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const me = await requireUser();
  const { welcome } = await searchParams;
  const [cats, fresh, wanted, talk, plans, latestIssue, total] = await Promise.all([
    categories(),
    listRecs({ limit: 9 }),
    listRecs({ sort: "wanted", limit: 4 }),
    all<{ id: string; body: string; created_at: string; name: string; image: string | null; rec_id: string; title: string; is_sample: number }>(
      `SELECT c.id, c.body, c.created_at, c.is_sample, u.name, u.image, r.id AS rec_id, r.title FROM comments c
       JOIN users u ON u.id = c.user_id JOIN recs r ON r.id = c.rec_id ORDER BY c.created_at DESC LIMIT 5`),
    all<{ id: string; title: string; emoji: string; target_date: string | null; options: number; is_sample: number }>(
      `SELECT p.id, p.title, p.emoji, p.target_date, p.is_sample, (SELECT COUNT(*) FROM plan_items WHERE plan_id = p.id) AS options
       FROM plans p WHERE p.status = 'open' ORDER BY p.target_date IS NULL, p.target_date, p.updated_at DESC LIMIT 3`),
    one<{ id: string; subject: string; issue_date: string }>("SELECT id, subject, issue_date FROM newsletters ORDER BY issue_date DESC LIMIT 1"),
    one<{ n: number }>("SELECT COUNT(*) AS n FROM recs"),
  ]);
  const sub = SUBS[new Date().getDate() % SUBS.length];

  return (
    <div>
      {welcome && (
        <div className="card mb-6 border-gold/30 bg-gold/[0.06] p-5">
          <p className="font-medium text-gold">Welcome in, {me.name.split(" ")[0]}. 🎉</p>
          <p className="mt-1 text-sm text-soft">Poke around, rate a few things you&apos;ve tried, and add the next thing you can&apos;t stop talking about. A name is enough to save it. You can update your name and photo on <Link href="/me" className="text-gold">your profile</Link>.</p>
        </div>
      )}
      <div className="mb-6">
        <h1 className="font-display text-[30px] leading-[1.05] tracking-tight sm:text-[36px]">{greeting(me.name)}</h1>
        <p className="mt-2 text-[15px] text-mute">{sub}</p>
      </div>

      <form action="/browse" className="mb-5 lg:hidden">
        <input name="q" placeholder="Search restaurants, shows, recipes…" className="field py-3" />
      </form>

      <div className="mb-8"><CategoryChips cats={cats} /></div>

      {Number(total?.n) === 0 ? (
        <Empty emoji="🌱" title="Nothing here yet" cta={{ href: "/add", label: "Add the first one" }}>
          Be the one who finally writes down that restaurant everyone keeps mentioning.
        </Empty>
      ) : (
        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          <section>
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-lg font-semibold tracking-tight">Fresh mentions</h2>
              <Link href="/browse" className="text-sm text-mute hover:text-gold">See all →</Link>
            </div>
            <RecGrid recs={fresh} />
          </section>

          <aside className="space-y-8">
            {latestIssue && (
              <Link href={`/newsletter/${latestIssue.id}`} className="card block p-4 transition hover:border-line-strong">
                <p className="eyebrow text-gold">The Thursday edition</p>
                <p className="mt-2 font-display text-xl leading-tight">{formatDay(latestIssue.issue_date, { month: "long", day: "numeric" })}</p>
                <p className="mt-1 line-clamp-2 text-sm text-mute">{latestIssue.subject.replace(/^Worth a Mention · [^:]+: /, "")}</p>
              </Link>
            )}

            <section>
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="font-semibold tracking-tight">Coming up</h2>
                <Link href="/plans" className="text-sm text-mute hover:text-gold">Plans →</Link>
              </div>
              {plans.length ? (
                <div className="card divide-y divide-line">
                  {plans.map((p) => (
                    <Link key={p.id} href={`/plans/${p.id}`} className="flex items-center gap-3 p-3.5 transition hover:bg-raised/60">
                      <span className="flex size-10 items-center justify-center rounded-xl bg-raised text-xl">{p.emoji}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{p.title}</span>
                        <span className="text-xs text-mute">{p.target_date ? formatDay(p.target_date) : "No date yet"} · {p.options} options</span>
                      </span>
                      {p.is_sample ? <SampleBadge /> : null}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-mute">No plans brewing. <Link href="/plans/new" className="text-gold">Start one</Link>.</p>
              )}
            </section>

            {talk.length > 0 && (
              <section>
                <h2 className="mb-2 font-semibold tracking-tight">Overheard</h2>
                <div className="space-y-3">
                  {talk.map((c) => (
                    <Link key={c.id} href={`/r/${c.rec_id}#comments`} className="flex gap-3 rounded-xl p-2 -mx-2 transition hover:bg-raised/60">
                      <Avatar name={c.name} image={c.image} size={28} />
                      <span className="min-w-0 text-sm">
                        <span className="text-soft"><span className="font-medium text-ink">{c.name.split(" ")[0]}</span> on <span className="text-ink">{c.title}</span></span>
                        <span className="mt-0.5 block line-clamp-2 text-mute">{snippet(c.body, 110)}</span>
                        <span className="text-[11px] text-faint">{timeAgo(c.created_at)}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {wanted.some((w) => w.interest_count > 0) && (
              <section>
                <h2 className="mb-1 font-semibold tracking-tight">Everyone wants to try</h2>
                <div className="divide-y divide-line">
                  {wanted.filter((w) => w.interest_count > 0).map((r) => (
                    <RecRow key={r.id} rec={r} right={<span className="text-xs text-mute">🙋 {r.interest_count}</span>} />
                  ))}
                </div>
              </section>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
