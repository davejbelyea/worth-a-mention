"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./AuthFrame";
import { Avatar } from "./ui";

const TABS = [
  { href: "/", label: "Home", icon: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" },
  { href: "/browse", label: "Browse", icon: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16-4-4" },
  { href: "/add", label: "Add", icon: "" },
  { href: "/plans", label: "Plans", icon: "M8 3v3m8-3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm4 8 2 2 4-4" },
  { href: "/newsletter", label: "Thursday", icon: "M4 6h16v12H4zM4 6l8 6 8-6" },
];

function active(path: string, href: string) {
  return href === "/" ? path === "/" : path.startsWith(href);
}

function Icon({ d, className = "size-[22px]" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function Nav({ user }: { user: { name: string; image: string | null; role: string } }) {
  const path = usePathname();
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:h-16 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo className="size-6" />
            <span className="font-display text-[22px] leading-none tracking-tight">Worth a Mention</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {TABS.filter((t) => t.href !== "/add").map((t) => (
              <Link key={t.href} href={t.href} className={`rounded-lg px-3 py-1.5 text-sm transition ${active(path, t.href) ? "bg-raised text-ink" : "text-mute hover:text-ink"}`}>
                {t.label === "Thursday" ? "Newsletter" : t.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/browse" className="btn-quiet hidden px-2.5 md:inline-flex lg:hidden" aria-label="Search"><Icon d={TABS[1].icon} className="size-5" /></Link>
            <form action="/browse" className="hidden lg:block">
              <input name="q" placeholder="Search everything…" className="field h-9 w-56 py-0 text-sm" />
            </form>
            <Link href="/add" className="btn-primary hidden h-9 px-3.5 md:inline-flex">
              <span className="text-lg leading-none">+</span> Add
            </Link>
            {user.role === "admin" && (
              <Link href="/admin" className={`btn-quiet px-2.5 ${path.startsWith("/admin") ? "text-ink" : ""}`} aria-label="Settings" title="Group settings">
                <Icon d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14.5 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" className="size-5" />
              </Link>
            )}
            <Link href="/me" aria-label="Your profile" className="rounded-full p-0.5 transition hover:ring-2 hover:ring-line-strong">
              <Avatar name={user.name} image={user.image} size={30} />
            </Link>
          </div>
        </div>
      </header>

      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/85 backdrop-blur-xl md:hidden">
        <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-2">
          {TABS.map((t) =>
            t.href === "/add" ? (
              <Link key={t.href} href="/add" aria-label="Add a recommendation" className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-gold text-[#1a1408] shadow-[0_8px_24px_-6px_rgba(232,184,106,0.55)] transition active:scale-95">
                <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              </Link>
            ) : (
              <Link key={t.href} href={t.href} className={`flex flex-col items-center gap-1 text-[10.5px] font-medium transition ${active(path, t.href) ? "text-gold" : "text-mute"}`}>
                <Icon d={t.icon} />
                {t.label}
              </Link>
            ),
          )}
        </div>
      </nav>
    </>
  );
}
