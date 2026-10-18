import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { getRec } from "@/lib/recs";
import { Avatar, Cover, SampleBadge } from "@/components/ui";
import { MyRating, InterestButton, Comments } from "@/components/RecInteractions";
import { AddToPlan } from "@/components/AddToPlan";
import { hostOf, mapLink, placeLine } from "@/lib/text";
import { formatDate, timeAgo } from "@/lib/time";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const rec = await getRec((await params).id);
  return { title: rec?.title || "Not found" };
}

export default async function RecPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ added?: string }> }) {
  const me = await requireUser();
  const { id } = await params;
  const { added } = await searchParams;
  const rec = await getRec(id);
  if (!rec) notFound();
  const openPlans = await all<{ id: string; title: string; emoji: string }>("SELECT id, title, emoji FROM plans WHERE status = 'open' ORDER BY updated_at DESC");

  const mine = rec.ratings.find((r) => r.user_id === me.id)?.stars ?? 0;
  const place = placeLine(rec);
  const map = rec.place_name || rec.address || rec.city ? mapLink(rec) : null;
  const canEdit = rec.created_by === me.id || me.role === "admin";
  const dist = [5, 4, 3, 2, 1].map((s) => ({ s, n: rec.ratings.filter((r) => r.stars === s).length }));
  const hero = rec.image_url || (rec.photos[0] ? `/uploads/${rec.photos[0].file}` : null);
  const gallery = rec.image_url ? rec.photos : rec.photos.slice(1);

  return (
    <article>
      {added && (
        <div className="card mb-6 border-gold/30 bg-gold/[0.06] p-4 text-sm">
          <span className="font-medium text-gold">Saved. </span>
          <span className="text-soft">The group will see it in the feed and in Thursday&apos;s newsletter.</span>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between text-sm">
        <Link href={rec.cat_slug ? `/browse?category=${rec.cat_slug}` : "/browse"} className="text-mute hover:text-ink">← {rec.cat_emoji} {rec.cat_name || "Browse"}</Link>
        {canEdit && <Link href={`/r/${rec.id}/edit`} className="btn-ghost h-9 px-3 text-sm">Edit</Link>}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px] lg:gap-10">
        <div className="min-w-0">
          {hero && (
            <div className="mb-6 overflow-hidden rounded-3xl">
              <Cover src={hero} emoji={rec.cat_emoji} className="aspect-[16/9] w-full" />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip pointer-events-none">{rec.cat_emoji} {rec.cat_name || "Other"}</span>
            {rec.is_sample ? <SampleBadge /> : null}
          </div>
          <h1 className="mt-3 font-display text-[30px] leading-[1.02] tracking-tight sm:text-[38px]">{rec.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-mute">
            {place && (map ? <a href={map} target="_blank" rel="noreferrer" className="hover:text-gold">📍 {rec.place_name && rec.place_name !== rec.title ? `${rec.place_name}, ` : ""}{place} ↗</a> : <span>📍 {place}</span>)}
            {rec.url && <a href={rec.url} target="_blank" rel="noreferrer" className="hover:text-gold">🔗 {rec.site_name || hostOf(rec.url)} ↗</a>}
          </div>

          <div className="card mt-6 p-5">
            <div className="flex items-center gap-3">
              <Avatar name={rec.author_name} image={rec.author_image} size={36} />
              <div className="text-sm">
                <p><span className="font-medium">{rec.author_name || "A former member"}</span> <span className="text-mute">mentioned this</span></p>
                <p className="text-xs text-faint">{formatDate(rec.created_at)}</p>
              </div>
            </div>
            {rec.why ? (
              <p className="mt-4 whitespace-pre-wrap text-[19px] font-medium leading-relaxed text-ink">&ldquo;{rec.why}&rdquo;</p>
            ) : (
              <p className="mt-4 text-sm text-mute">No notes, just a strong hunch it&apos;s worth your time.</p>
            )}
          </div>

          {/* On phones the ratings sit right under the post. */}
          <div className="mt-6 lg:hidden"><Sidebar /></div>

          {gallery.length > 0 && (
            <section className="mt-8">
              <h2 className="eyebrow mb-3">Photos</h2>
              <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0">
                {gallery.map((p) => (
                  <a key={p.id} href={`/uploads/${p.file}`} target="_blank" rel="noreferrer" className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/uploads/${p.file}`} alt="" className="aspect-square w-40 rounded-2xl border border-line object-cover sm:w-full" />
                  </a>
                ))}
              </div>
            </section>
          )}

          {(rec.description || rec.tags.length > 0 || rec.links.length > 0) && (
            <section className="mt-8 space-y-4">
              {rec.description && <p className="text-[15px] leading-relaxed text-soft">{rec.description}</p>}
              {rec.links.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {rec.links.map((l) => <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="chip">🔗 {hostOf(l.url)} ↗</a>)}
                </div>
              )}
              {rec.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {rec.tags.map((t) => <Link key={t} href={`/browse?tag=${encodeURIComponent(t)}`} className="rounded-full bg-raised px-2.5 py-1 text-xs text-mute hover:text-gold">#{t}</Link>)}
                </div>
              )}
            </section>
          )}

          <section id="comments" className="mt-10 scroll-mt-24">
            <h2 className="mb-5 text-lg font-semibold tracking-tight">Comments <span className="text-mute">{rec.comments.length || ""}</span></h2>
            <Comments recId={rec.id} meId={me.id} isAdmin={me.role === "admin"} meName={me.name} meImage={me.image}
              comments={rec.comments.map((c) => ({ ...c, when: timeAgo(c.created_at) }))} />
          </section>
        </div>

        <aside className="hidden lg:block"><div className="sticky top-24"><Sidebar /></div></aside>
      </div>
    </article>
  );

  function Sidebar() {
    return (
      <div className="space-y-4">
        <div className="card p-5">
          <p className="eyebrow">Group rating</p>
          <div className="mt-3 flex items-center gap-5">
            <div>
              <div className="font-display text-[48px] leading-none tabular-nums">{rec!.avg_rating ? rec!.avg_rating.toFixed(1) : "–"}</div>
              <div className="mt-1 text-xs text-mute">{rec!.rating_count} {rec!.rating_count === 1 ? "rating" : "ratings"}</div>
            </div>
            <div className="flex-1 space-y-1">
              {dist.map((d) => (
                <div key={d.s} className="flex items-center gap-2 text-[11px] text-mute">
                  <span className="w-3 tabular-nums">{d.s}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-raised">
                    <span className="block h-full rounded-full bg-gold" style={{ width: `${rec!.rating_count ? (d.n / rec!.rating_count) * 100 : 0}%` }} />
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-5 border-t border-line pt-4">
            <p className="mb-2 text-sm font-medium">Your rating</p>
            <MyRating recId={rec!.id} initial={mine} />
          </div>
          {rec!.ratings.length > 0 && (
            <ul className="mt-4 space-y-2 border-t border-line pt-4">
              {rec!.ratings.map((r) => (
                <li key={r.user_id} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2"><Avatar name={r.name} image={r.image} size={22} />{r.name.split(" ")[0]}</span>
                  <span className="tracking-tight text-gold">{"★".repeat(r.stars)}<span className="text-faint">{"★".repeat(5 - r.stars)}</span></span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <p className="eyebrow mb-3">Want to try</p>
          <InterestButton recId={rec!.id} on={rec!.interested.some((i) => i.user_id === me.id)} people={rec!.interested} meName={me.name} />
        </div>

        <div className="card p-5">
          <p className="eyebrow mb-3">Plans</p>
          {rec!.plans.length > 0 && (
            <ul className="mb-3 space-y-1.5">
              {rec!.plans.map((p) => <li key={p.id}><Link href={`/plans/${p.id}`} className="text-sm hover:text-gold">{p.emoji} {p.title}</Link></li>)}
            </ul>
          )}
          <AddToPlan recId={rec!.id} plans={openPlans} already={rec!.plans.map((p) => p.id)} />
        </div>
      </div>
    );
  }
}
