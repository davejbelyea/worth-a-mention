import Link from "next/link";
import { categories, contributors, listRecs, popularTags } from "@/lib/recs";
import { RecGrid } from "@/components/RecCard";
import { CategoryChips } from "@/components/CategoryChips";
import { Empty } from "@/components/ui";
import { AutoSelect } from "@/components/AutoSubmit";
import { NEW_ENGLAND } from "@/lib/text";

export const metadata = { title: "Browse" };

type SP = { q?: string; category?: string; by?: string; rating?: string; where?: string; tag?: string; sort?: string };

export default async function Browse({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const sort = (["new", "top", "talked", "wanted", "old"].includes(sp.sort || "") ? sp.sort : "new") as "new";
  const [cats, people, tags, recs] = await Promise.all([
    categories(),
    contributors(),
    popularTags(18),
    listRecs({ q: sp.q, category: sp.category, by: sp.by, minRating: Number(sp.rating) || undefined, where: sp.where, tag: sp.tag, sort, limit: 120 }),
  ]);
  const cat = cats.find((c) => c.slug === sp.category);
  const keep = (omit: keyof SP) => new URLSearchParams(Object.entries(sp).filter(([k, v]) => k !== omit && v) as [string, string][]).toString();
  const filtered = Boolean(sp.q || sp.by || sp.rating || sp.where || sp.tag);

  return (
    <div>
      <div className="mb-5">
        <p className="eyebrow mb-1.5">{sp.q ? "Search" : "Browse"}</p>
        <h1 className="font-display text-[26px] leading-[1.05] tracking-tight sm:text-[32px]">
          {sp.q ? <>Results for &ldquo;{sp.q}&rdquo;</> : cat ? <>{cat.emoji} {cat.name}</> : sp.tag ? <>#{sp.tag}</> : "Everything worth a mention"}
        </h1>
      </div>

      <form className="mb-4" action="/browse">
        {Object.entries(sp).filter(([k, v]) => k !== "q" && v).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        <input name="q" defaultValue={sp.q} placeholder="Search titles, notes, places, tags, comments…" className="field py-3" />
      </form>

      <div className="mb-4"><CategoryChips cats={cats} active={sp.category} extra={keep("category")} /></div>

      <form action="/browse" className="mb-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        {sp.q && <input type="hidden" name="q" value={sp.q} />}
        {sp.category && <input type="hidden" name="category" value={sp.category} />}
        {sp.tag && <input type="hidden" name="tag" value={sp.tag} />}
        <AutoSelect name="by" defaultValue={sp.by || ""} className="field h-10 py-0 text-sm sm:w-auto" aria-label="Contributor">
          <option value="">Anyone</option>
          {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </AutoSelect>
        <AutoSelect name="rating" defaultValue={sp.rating || ""} className="field h-10 py-0 text-sm sm:w-auto" aria-label="Rating">
          <option value="">Any rating</option>
          <option value="4.5">★ 4.5 and up</option>
          <option value="4">★ 4 and up</option>
          <option value="3">★ 3 and up</option>
        </AutoSelect>
        <AutoSelect name="where" defaultValue={sp.where || ""} className="field h-10 py-0 text-sm sm:w-auto" aria-label="Location">
          <option value="">Anywhere</option>
          <option value="ne">All of New England</option>
          {NEW_ENGLAND.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
          <option value="elsewhere">Outside New England</option>
        </AutoSelect>
        <AutoSelect name="sort" defaultValue={sort} className="field h-10 py-0 text-sm sm:w-auto" aria-label="Sort">
          <option value="new">Newest</option>
          <option value="top">Highest rated</option>
          <option value="talked">Most talked about</option>
          <option value="wanted">Most wanted</option>
          <option value="old">Oldest first</option>
        </AutoSelect>
        {(filtered || sp.category) && <Link href="/browse" className="btn-quiet col-span-2 h-10 text-sm sm:col-span-1">Clear all</Link>}
      </form>

      {tags.length > 0 && (
        <div className="no-scrollbar -mx-4 mb-8 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {tags.map((t) => (
            <Link key={t.tag} href={sp.tag === t.tag ? `/browse?${keep("tag")}` : `/browse?${new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([, v]) => v)), tag: t.tag })}`}
              className={`rounded-full px-2.5 py-1 text-xs transition ${sp.tag === t.tag ? "bg-gold/15 text-gold" : "text-mute hover:bg-raised hover:text-ink"}`}>
              #{t.tag}
            </Link>
          ))}
        </div>
      )}

      <p className="mb-4 text-sm text-mute">{recs.length === 120 ? "120+" : recs.length} {recs.length === 1 ? "recommendation" : "recommendations"}</p>
      {recs.length ? (
        <RecGrid recs={recs} />
      ) : (
        <Empty emoji="🔍" title="Nothing matches that (yet)" cta={{ href: `/add${sp.q ? `?title=${encodeURIComponent(sp.q)}` : ""}`, label: sp.q ? `Add “${sp.q}”` : "Add something" }}>
          Try loosening a filter, or be the first to mention it.
        </Empty>
      )}
    </div>
  );
}
