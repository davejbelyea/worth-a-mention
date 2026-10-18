import Link from "next/link";
import type { RecCard as Rec } from "@/lib/recs";
import { Avatar, Cover, SampleBadge, StarsDisplay } from "./ui";
import { placeLine, snippet } from "@/lib/text";
import { timeAgo } from "@/lib/time";

export function RecCard({ rec }: { rec: Rec }) {
  const place = placeLine(rec);
  return (
    <Link href={`/r/${rec.id}`} className="card group flex flex-col overflow-hidden transition hover:border-line-strong hover:bg-raised/60">
      <div className="relative aspect-[16/10] overflow-hidden border-b border-line">
        <Cover src={rec.cover} emoji={rec.cat_emoji} className="size-full transition duration-500 group-hover:scale-[1.03]" />
        <span className="absolute left-2.5 top-2.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md">
          {rec.cat_emoji} {rec.cat_name || "Other"}
        </span>
        {rec.is_sample ? <SampleBadge className="absolute right-2.5 top-2.5 border-white/30 bg-black/50 text-white/70 backdrop-blur-md" /> : null}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-[16px] font-semibold leading-snug tracking-tight">{rec.title}</h3>
        {place && <p className="mt-1 text-xs text-mute">📍 {place}</p>}
        {(rec.why || rec.description) && <p className="mt-2 line-clamp-2 text-[13.5px] leading-relaxed text-soft">{rec.why ? `“${snippet(rec.why, 160)}”` : snippet(rec.description, 160)}</p>}
        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <span className="flex min-w-0 items-center gap-2 text-xs text-mute">
            <Avatar name={rec.author_name} image={rec.author_image} size={20} />
            <span className="truncate">{rec.author_name?.split(" ")[0]} <span className="text-faint">· {timeAgo(rec.created_at)}</span></span>
          </span>
          <span className="flex shrink-0 items-center gap-3 text-xs text-mute">
            <StarsDisplay value={rec.avg_rating} />
            {rec.comment_count > 0 && <span>💬 {rec.comment_count}</span>}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function RecRow({ rec, right }: { rec: Rec; right?: React.ReactNode }) {
  const place = placeLine(rec);
  return (
    <div className="flex items-center gap-3 py-3">
      <Link href={`/r/${rec.id}`} className="shrink-0">
        <Cover src={rec.cover} emoji={rec.cat_emoji} className="size-14 rounded-xl border border-line" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/r/${rec.id}`} className="line-clamp-1 font-medium hover:text-gold">{rec.title}</Link>
        <p className="mt-0.5 truncate text-xs text-mute">
          {rec.cat_emoji} {rec.cat_name}{place ? ` · ${place}` : ""} · {rec.author_name?.split(" ")[0]}
        </p>
        <div className="mt-1"><StarsDisplay value={rec.avg_rating} count={rec.rating_count} /></div>
      </div>
      {right}
    </div>
  );
}

export function RecGrid({ recs }: { recs: Rec[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {recs.map((r) => <RecCard key={r.id} rec={r} />)}
    </div>
  );
}
