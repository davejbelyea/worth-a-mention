import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { all, one } from "@/lib/db";
import { Avatar, Cover, SampleBadge, StarsDisplay } from "@/components/ui";
import { VoteButton, RemoveItem, DecideButton, AddOption, PlanComments } from "@/components/PlanInteractions";
import { formatDay, timeAgo } from "@/lib/time";
import { placeLine } from "@/lib/text";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const p = await one<{ title: string }>("SELECT title FROM plans WHERE id = ?", [(await params).id]);
  return { title: p?.title || "Plan" };
}

type Item = { id: string; rec_id: string; added_by: string | null; adder: string | null; title: string; cover: string | null; emoji: string | null; category: string | null; city: string | null; state: string | null; country: string | null; avg: number | null; ratings: number };

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id } = await params;
  const plan = await one<{ id: string; title: string; description: string | null; emoji: string; target_date: string | null; status: string; decided_item_id: string | null; created_by: string | null; creator: string | null; creator_image: string | null; created_at: string; is_sample: number }>(
    "SELECT p.*, u.name AS creator, u.image AS creator_image FROM plans p LEFT JOIN users u ON u.id = p.created_by WHERE p.id = ?", [id]);
  if (!plan) notFound();

  const [items, votes, comments] = await Promise.all([
    all<Item>(`SELECT i.id, i.rec_id, i.added_by, u.name AS adder, r.title, r.city, r.state, r.country, c.emoji, c.name AS category,
        COALESCE(r.image_url, (SELECT '/uploads/' || p.file FROM rec_photos p WHERE p.rec_id = r.id ORDER BY p.sort LIMIT 1)) AS cover,
        (SELECT AVG(stars) FROM ratings WHERE rec_id = r.id) AS avg, (SELECT COUNT(*) FROM ratings WHERE rec_id = r.id) AS ratings
      FROM plan_items i JOIN recs r ON r.id = i.rec_id LEFT JOIN categories c ON c.id = r.category_id LEFT JOIN users u ON u.id = i.added_by
      WHERE i.plan_id = ? ORDER BY i.created_at`, [id]),
    all<{ item_id: string; user_id: string; name: string; image: string | null }>(
      "SELECT v.item_id, v.user_id, u.name, u.image FROM plan_votes v JOIN users u ON u.id = v.user_id JOIN plan_items i ON i.id = v.item_id WHERE i.plan_id = ? ORDER BY v.created_at", [id]),
    all<{ id: string; user_id: string | null; body: string; created_at: string; name: string | null; image: string | null }>(
      "SELECT c.*, u.name, u.image FROM plan_comments c LEFT JOIN users u ON u.id = c.user_id WHERE c.plan_id = ? ORDER BY c.created_at", [id]),
  ]);
  const ranked = items
    .map((it) => ({ ...it, voters: votes.filter((v) => v.item_id === it.id) }))
    .sort((a, b) => b.voters.length - a.voters.length);
  const top = ranked[0]?.voters.length ? ranked[0] : null;
  const decided = ranked.find((r) => r.id === plan.decided_item_id);
  const isOpen = plan.status === "open";
  const canManage = plan.created_by === me.id || me.role === "admin";
  const voterCount = new Set(votes.map((v) => v.user_id)).size;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between text-sm">
        <Link href="/plans" className="text-mute hover:text-ink">← All plans</Link>
        {canManage && <Link href={`/plans/${id}/edit`} className="btn-ghost h-9 px-3 text-sm">Edit</Link>}
      </div>

      <header className="mb-8">
        <div className="flex items-center gap-3">
          <span className="flex size-14 items-center justify-center rounded-2xl border border-line bg-surface text-3xl">{plan.emoji}</span>
          {plan.is_sample ? <SampleBadge /> : null}
        </div>
        <h1 className="mt-4 font-display text-[40px] leading-[1.02] tracking-tight sm:text-[52px]">{plan.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-mute">
          {plan.target_date && <span>🗓️ {formatDay(plan.target_date, { weekday: "long", month: "long", day: "numeric" })}</span>}
          <span className="flex items-center gap-1.5"><Avatar name={plan.creator} image={plan.creator_image} size={18} /> Started by {plan.creator?.split(" ")[0] || "someone"}</span>
          <span>{voterCount} {voterCount === 1 ? "person has" : "people have"} voted</span>
        </div>
        {plan.description && <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-soft">{plan.description}</p>}
      </header>

      {decided && (
        <div className="card mb-6 flex flex-wrap items-center justify-between gap-3 border-vote/40 bg-vote/[0.07] p-4">
          <p className="text-sm"><span className="font-semibold text-vote">✓ It&apos;s decided:</span> <Link href={`/r/${decided.rec_id}`} className="font-medium hover:underline">{decided.title}</Link></p>
          <DecideButton planId={id} itemId={null} label="Reopen voting" />
        </div>
      )}

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">The options</h2>
          <p className="text-right text-xs text-mute">
            <span className="text-vote">Votes</span> pick what we do.<br className="sm:hidden" /> <span className="text-gold">★ Stars</span> are how good it is.
          </p>
        </div>
        {isOpen && <p className="mb-4 text-sm text-mute">Vote for every option you&apos;d be happy with. Tap again to take your vote back.</p>}

        <div className="card divide-y divide-line">
          {ranked.map((it, i) => (
            <div key={it.id} className={`flex items-center gap-3 p-3.5 sm:gap-4 sm:p-4 ${decided?.id === it.id ? "bg-vote/[0.05]" : ""}`}>
              <span className={`w-5 text-center text-sm tabular-nums ${i === 0 && top ? "text-vote" : "text-faint"}`}>{i + 1}</span>
              <Link href={`/r/${it.rec_id}`} className="shrink-0"><Cover src={it.cover} emoji={it.emoji} className="size-14 rounded-xl border border-line" /></Link>
              <div className="min-w-0 flex-1">
                <Link href={`/r/${it.rec_id}`} className="line-clamp-1 font-medium hover:text-gold">{it.title}</Link>
                <p className="truncate text-xs text-mute">{it.emoji} {it.category}{placeLine(it) ? ` · ${placeLine(it)}` : ""}</p>
                <div className="mt-1 flex items-center gap-3">
                  <StarsDisplay value={it.avg} count={it.ratings} />
                  <span className="hidden text-[11px] text-faint sm:inline">added by {it.adder?.split(" ")[0]}</span>
                  {(it.added_by === me.id || canManage) && isOpen && <RemoveItem itemId={it.id} />}
                  {isOpen && top?.id === it.id && <DecideButton planId={id} itemId={it.id} />}
                </div>
              </div>
              <VoteButton itemId={it.id} voted={it.voters.some((v) => v.user_id === me.id)} voters={it.voters} meName={me.name} disabled={!isOpen} />
            </div>
          ))}
          {ranked.length === 0 && <p className="p-5 text-sm text-mute">No options yet. Add a few from the site and let the voting begin.</p>}
        </div>
        {isOpen && <div className="mt-3"><AddOption planId={id} existing={items.map((i) => i.rec_id)} /></div>}
      </section>

      <section className="mt-12">
        <h2 className="mb-5 text-lg font-semibold tracking-tight">Discussion <span className="text-mute">{comments.length || ""}</span></h2>
        <PlanComments planId={id} meId={me.id} isAdmin={me.role === "admin"} meName={me.name} meImage={me.image}
          comments={comments.map((c) => ({ ...c, when: timeAgo(c.created_at) }))} />
      </section>
    </div>
  );
}
