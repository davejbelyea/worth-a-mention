import Link from "next/link";
import type { Category } from "@/lib/recs";

export function CategoryChips({ cats, active, base = "/browse", extra = "" }: { cats: Category[]; active?: string; base?: string; extra?: string }) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
      <Link href={`${base}${extra ? `?${extra}` : ""}`} className={`chip ${!active ? "chip-on" : ""}`}>All</Link>
      {cats.map((c) => (
        <Link key={c.id} href={`${base}?category=${c.slug}${extra ? `&${extra}` : ""}`} className={`chip ${active === c.slug ? "chip-on" : ""}`}>
          <span>{c.emoji}</span>{c.name}
        </Link>
      ))}
    </div>
  );
}
