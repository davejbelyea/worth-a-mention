import Link from "next/link";
import type { Category } from "@/lib/recs";

/** Airbnb-style category bar: emoji over label, underline on the active one. */
export function CategoryChips({ cats, active, base = "/browse", extra = "" }: { cats: Category[]; active?: string; base?: string; extra?: string }) {
  const items = [{ slug: "", name: "All", emoji: "🏠" }, ...cats];
  return (
    <div className="no-scrollbar -mx-4 flex gap-7 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:gap-9 sm:px-0">
      {items.map((c) => {
        const on = (active || "") === c.slug;
        const href = c.slug ? `${base}?category=${c.slug}${extra ? `&${extra}` : ""}` : `${base}${extra ? `?${extra}` : ""}`;
        return (
          <Link key={c.slug || "all"} href={href}
            className={`-mb-px flex shrink-0 flex-col items-center gap-1.5 border-b-2 pb-3 pt-1 text-[12px] font-semibold transition ${on ? "border-ink text-ink" : "border-transparent text-mute opacity-80 hover:border-line-strong hover:text-ink hover:opacity-100"}`}>
            <span className={`text-2xl transition ${on ? "" : "grayscale-[35%]"}`}>{c.emoji}</span>
            <span className="whitespace-nowrap">{c.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
