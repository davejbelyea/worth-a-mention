import Link from "next/link";
import type { RecCard as Rec } from "@/lib/recs";
import { Avatar, Cover, SampleBadge, StarsDisplay } from "./ui";
import { placeLine, snippet } from "@/lib/text";
import { timeAgo } from "@/lib/time";

export function RecCard({ rec }: { rec: Rec }) {
  const place = placeLine(rec);
  return (
    <Link href={`/r/${rec.id}`} className="group flex flex-col">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-raised">
        <Cover src={rec.cover} emoji={rec.cat_emoji} className="size-full transition duration-500 group-hover:scale-[1.04]" />
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[12px] font-semibold text-ink shadow-sm">
          {rec.cat_emoji} {rec.cat_name || "Other"}
        </span>
        {rec.is_sample ? <SampleBadge className="absolute right-3 top-3 bg-white/90 shadow-sm" /> : null}
        {rec.interest_count > 0 && (
          <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-2.5 py-1 text-[12px] font-semibold text-ink shadow-sm">
            🙋 {rec.interest_count} want to try
          </span>
        )}
      </div>
      <div className="pt-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-1 text-[15px] font-bold leading-snug">{rec.title}</h3>
          <span className="shrink-0 pt-px"><StarsDisplay value={rec.avg_rating} /></span>
        </div>
        <p className="mt-0.5 truncate text-[14px] text-mute">{place || rec.site_name || rec.cat_name}</p>
        {(rec.why || rec.description) && <p className="mt-1 line-clamp-2 text-[14px] leading-snug text-soft">{rec.why ? `“${snippet(rec.why, 140)}”` : snippet(rec.description, 140)}</p>}
        <div className="mt-2 flex items-center gap-2 text-[13px] text-mute">
          <Avatar name={rec.author_name} image={rec.author_image} size={20} />
          <span className="truncate">{rec.author_name?.split(" ")[0]} · {timeAgo(rec.created_at)}</span>
          {rec.comment_count > 0 && <span className="ml-auto shrink-0">💬 {rec.comment_count}</span>}
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
        <Cover src={rec.cover} emoji={rec.cat_emoji} className="size-14 rounded-xl" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/r/${rec.id}`} className="line-clamp-1 font-semibold hover:underline">{rec.title}</Link>
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
    <div className="grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
      {recs.map((r) => <RecCard key={r.id} rec={r} />)}
    </div>
  );
}
