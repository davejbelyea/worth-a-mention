import Link from "next/link";
import { all } from "@/lib/db";
import { Empty, PageHeader, SampleBadge, AvatarStack } from "@/components/ui";
import { formatDay } from "@/lib/time";

export const metadata = { title: "Plans" };

type P = { id: string; title: string; emoji: string; description: string | null; target_date: string | null; status: string; is_sample: number; options: number; comments: number; creator: string | null; decided: string | null };

export default async function PlansPage() {
  const plans = await all<P>(`
    SELECT p.*, u.name AS creator,
      (SELECT COUNT(*) FROM plan_items WHERE plan_id = p.id) AS options,
      (SELECT COUNT(*) FROM plan_comments WHERE plan_id = p.id) AS comments,
      (SELECT r.title FROM plan_items i JOIN recs r ON r.id = i.rec_id WHERE i.id = p.decided_item_id) AS decided
    FROM plans p LEFT JOIN users u ON u.id = p.created_by
    ORDER BY p.status = 'open' DESC, p.target_date IS NULL, p.target_date, p.updated_at DESC`);
  const voters = await all<{ plan_id: string; name: string; image: string | null }>(
    `SELECT DISTINCT i.plan_id, u.name, u.image FROM plan_votes v JOIN plan_items i ON i.id = v.item_id JOIN users u ON u.id = v.user_id`);
  const open = plans.filter((p) => p.status === "open");
  const done = plans.filter((p) => p.status !== "open");

  const Card = ({ p }: { p: P }) => {
    const vs = voters.filter((v) => v.plan_id === p.id);
    return (
      <Link href={`/plans/${p.id}`} className="card flex flex-col p-5 transition hover:border-line-strong hover:bg-raised/50">
        <div className="flex items-start justify-between gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-raised text-2xl">{p.emoji}</span>
          <span className="flex items-center gap-2">
            {p.is_sample ? <SampleBadge /> : null}
            {p.target_date && <span className="rounded-full border border-line px-2.5 py-1 text-xs text-soft">{formatDay(p.target_date)}</span>}
          </span>
        </div>
        <h3 className="mt-4 text-lg font-semibold tracking-tight">{p.title}</h3>
        {p.decided ? <p className="mt-1 text-sm text-vote">✓ Going with {p.decided}</p> : p.description && <p className="mt-1 line-clamp-2 text-sm text-mute">{p.description}</p>}
        <div className="mt-auto flex items-center justify-between pt-5 text-xs text-mute">
          <span>{p.options} {p.options === 1 ? "option" : "options"} · {p.comments} 💬</span>
          {vs.length > 0 ? <AvatarStack people={vs} size={20} max={4} /> : <span>No votes yet</span>}
        </div>
      </Link>
    );
  };

  return (
    <div>
      <PageHeader eyebrow="Shared plans" title="Let's actually do it" sub="Pull ideas from the site, vote on what sounds good, and make the call."
        action={<Link href="/plans/new" className="btn-primary">＋ <span className="hidden sm:inline">New plan</span></Link>} />
      {open.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{open.map((p) => <Card key={p.id} p={p} />)}</div>
      ) : (
        <Empty emoji="🗓️" title="No plans on the go" cta={{ href: "/plans/new", label: "Start a plan" }}>Try “Next Dinner Out” or “Weekend Trip Ideas” and let everyone pile on.</Empty>
      )}
      {done.length > 0 && (
        <section className="mt-12">
          <h2 className="eyebrow mb-4">Decided</h2>
          <div className="grid gap-4 opacity-80 sm:grid-cols-2 lg:grid-cols-3">{done.map((p) => <Card key={p.id} p={p} />)}</div>
        </section>
      )}
    </div>
  );
}
