import Link from "next/link";
import type { DigestData, DigestRec } from "@/lib/digest";
import { Cover } from "./ui";

function Rec({ r }: { r: DigestRec }) {
  return (
    <Link href={`/r/${r.id}`} className="flex gap-4 py-4 transition hover:opacity-90">
      <Cover src={r.cover} emoji={r.emoji} className="size-16 shrink-0 rounded-xl border border-line sm:size-20" />
      <div className="min-w-0">
        <p className="font-semibold leading-snug">{r.title}</p>
        <p className="mt-0.5 text-xs text-mute">{r.emoji} {r.category}{r.place ? ` · ${r.place}` : ""} · from {r.author.split(" ")[0]}{r.age ? ` · ${r.age}` : ""}</p>
        {r.why && <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-soft">&ldquo;{r.why}&rdquo;</p>}
        <p className="mt-1 text-xs">{r.avg ? <><span className="text-gold">★ {r.avg.toFixed(1)}</span> <span className="text-mute">({r.ratings})</span></> : <span className="text-faint">Not rated yet</span>}</p>
      </div>
    </Link>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line px-5 py-6 sm:px-8">
      <h2 className="mb-1 font-display text-[13px] uppercase tracking-[0.14em] text-gold">{title}</h2>
      {children}
    </section>
  );
}

export function DigestView({ data, header }: { data: DigestData; header: React.ReactNode }) {
  return (
    <div className="card overflow-hidden">
      <div className="px-5 pb-6 pt-7 sm:px-8">
        {header}
        <p className="mt-5 text-[17px] leading-relaxed text-soft">{data.intro}</p>
        {(data.stats.recs > 0 || data.stats.comments > 0 || data.stats.ratings > 0) && (
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            {[["New", data.stats.recs], ["Comments", data.stats.comments], ["Ratings", data.stats.ratings]].map(([l, n]) => (
              <div key={l} className="rounded-xl bg-raised py-3">
                <div className="font-display text-2xl tabular-nums">{n}</div>
                <div className="text-[11px] text-mute">{l}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {data.newRecs.length > 0 && (
        <Section title="Fresh this week">
          <div className="divide-y divide-line">{data.newRecs.map((r) => <Rec key={r.id} r={r} />)}</div>
          {data.moreNew > 0 && <Link href="/browse?sort=new" className="mt-2 inline-block text-sm text-gold">Plus {data.moreNew} more →</Link>}
        </Section>
      )}

      {data.talk.length > 0 && (
        <Section title="Popular discussions">
          <div className="divide-y divide-line">
            {data.talk.map((t) => (
              <Link key={t.kind + t.id} href={`/${t.kind === "rec" ? "r" : "plans"}/${t.id}`} className="block py-4 transition hover:opacity-90">
                <p className="font-semibold">{t.emoji} {t.title}</p>
                <p className="mt-0.5 text-xs text-mute">{t.count} {t.count === 1 ? "comment" : "comments"} from {t.people.map((p) => p.split(" ")[0]).join(", ")}</p>
                {t.latest.body && <p className="mt-1.5 text-sm text-soft"><span className="font-medium text-ink">{t.latest.name.split(" ")[0]}:</span> {t.latest.body}</p>}
              </Link>
            ))}
          </div>
        </Section>
      )}

      {data.rediscover && (
        <Section title="From the vault">
          <p className="text-sm text-mute">Worth a second look, in case it slipped through the cracks.</p>
          <Rec r={data.rediscover} />
        </Section>
      )}

      {data.plans.length > 0 && (
        <Section title="Coming up">
          <div className="divide-y divide-line">
            {data.plans.map((p) => (
              <Link key={p.id} href={`/plans/${p.id}`} className="block py-4 transition hover:opacity-90">
                <p className="font-semibold">{p.emoji} {p.title}</p>
                <p className="mt-0.5 text-xs text-mute">{p.when ? `${p.when} · ` : ""}{p.options} options · {p.voters} voted</p>
                <p className="mt-1.5 text-sm text-soft">{p.leader ? <>In the lead: <span className="font-medium text-vote">{p.leader.title}</span> ({p.leader.votes} {p.leader.votes === 1 ? "vote" : "votes"})</> : "No votes yet. Go break the tie before there is one."}</p>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {data.quiet && (
        <div className="border-t border-line px-5 py-6 sm:px-8">
          <Link href="/add" className="btn-primary">Add something in ten seconds</Link>
        </div>
      )}

      <div className="border-t border-line px-5 py-6 text-sm text-mute sm:px-8">{data.signoff}</div>
    </div>
  );
}
