import Link from "next/link";

const HUES = [28, 200, 340, 150, 260, 12, 95, 310, 180, 45];
function hue(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
  return HUES[Math.abs(h) % HUES.length];
}

export function Avatar({ name, image, size = 28, className = "" }: { name?: string | null; image?: string | null; size?: number; className?: string }) {
  const n = name || "?";
  const initials = n.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const style = { width: size, height: size, fontSize: Math.max(10, size * 0.38) };
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt={n} title={n} style={style} referrerPolicy="no-referrer" className={`shrink-0 rounded-full object-cover ring-1 ring-line ${className}`} />;
  }
  const h = hue(n);
  return (
    <span title={n} style={{ ...style, background: `hsl(${h} 35% 22%)`, color: `hsl(${h} 70% 78%)` }} className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold ring-1 ring-line ${className}`}>
      {initials}
    </span>
  );
}

export function AvatarStack({ people, max = 5, size = 24 }: { people: { name: string; image?: string | null }[]; max?: number; size?: number }) {
  const shown = people.slice(0, max);
  return (
    <span className="inline-flex items-center">
      {shown.map((p, i) => (
        <Avatar key={p.name + i} name={p.name} image={p.image} size={size} className={`${i ? "-ml-1.5" : ""} ring-2 ring-surface`} />
      ))}
      {people.length > max && <span className="ml-1.5 text-xs text-mute">+{people.length - max}</span>}
    </span>
  );
}

export function StarsDisplay({ value, count, size = "sm" }: { value: number | null; count?: number; size?: "sm" | "md" }) {
  if (!value) return <span className={`${size === "md" ? "text-sm" : "text-xs"} text-faint`}>No ratings yet</span>;
  return (
    <span className={`inline-flex items-center gap-1 ${size === "md" ? "text-sm" : "text-xs"}`}>
      <span className="text-gold">★</span>
      <span className="font-medium text-ink tabular-nums">{value.toFixed(1)}</span>
      {count !== undefined && <span className="text-mute">({count})</span>}
    </span>
  );
}

export function SampleBadge({ className = "" }: { className?: string }) {
  return (
    <span title="Sample content. The founder can remove it all in Settings." className={`inline-flex items-center rounded-md border border-dashed border-mute/50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-mute ${className}`}>
      Sample
    </span>
  );
}

export function PageHeader({ eyebrow, title, sub, action }: { eyebrow?: string; title: React.ReactNode; sub?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="font-display text-[34px] leading-[1.05] tracking-tight sm:text-[42px]">{title}</h1>
        {sub && <p className="mt-2 text-[15px] text-mute">{sub}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Empty({ emoji = "🫙", title, children, cta }: { emoji?: string; title: string; children?: React.ReactNode; cta?: { href: string; label: string } }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <div className="text-4xl">{emoji}</div>
      <h3 className="mt-4 font-medium">{title}</h3>
      {children && <p className="mt-1.5 max-w-sm text-sm text-mute">{children}</p>}
      {cta && <Link href={cta.href} className="btn-primary mt-5">{cta.label}</Link>}
    </div>
  );
}

export function Cover({ src, emoji, className = "" }: { src?: string | null; emoji?: string | null; className?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" className={`object-cover ${className}`} />;
  }
  const h = hue(emoji || "✨");
  return (
    <div className={`flex items-center justify-center ${className}`} style={{ background: `radial-gradient(120% 90% at 20% 10%, hsl(${h} 30% 20%), hsl(${h} 18% 11%) 70%)` }}>
      <span className="text-4xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.45)]">{emoji || "✨"}</span>
    </div>
  );
}
