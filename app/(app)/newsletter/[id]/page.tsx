import Link from "next/link";
import { notFound } from "next/navigation";
import { one } from "@/lib/db";
import { DigestView } from "@/components/DigestView";
import { SampleBadge } from "@/components/ui";
import { formatDay } from "@/lib/time";
import type { DigestData } from "@/lib/digest";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const n = await one<{ issue_date: string }>("SELECT issue_date FROM newsletters WHERE id = ?", [(await params).id]);
  return { title: n ? `Newsletter, ${formatDay(n.issue_date, { month: "long", day: "numeric" })}` : "Newsletter" };
}

export default async function Edition({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = await one<{ id: string; edition: number; issue_date: string; data: string; is_sample: number }>("SELECT * FROM newsletters WHERE id = ?", [id]);
  if (!n) notFound();
  const [prev, next] = await Promise.all([
    one<{ id: string }>("SELECT id FROM newsletters WHERE issue_date < ? ORDER BY issue_date DESC LIMIT 1", [n.issue_date]),
    one<{ id: string }>("SELECT id FROM newsletters WHERE issue_date > ? ORDER BY issue_date LIMIT 1", [n.issue_date]),
  ]);
  const data = JSON.parse(n.data) as DigestData;
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/newsletter" className="mb-4 inline-block text-sm text-mute hover:text-ink">← All editions</Link>
      <DigestView data={data} header={
        <>
          <div className="flex items-center gap-2 text-xs text-mute">No. {n.edition} · {formatDay(n.issue_date, { weekday: "long", month: "long", day: "numeric", year: "numeric" })} {n.is_sample ? <SampleBadge /> : null}</div>
          <h1 className="mt-2 font-display text-[40px] leading-none tracking-tight">Worth a Mention</h1>
          <p className="mt-1.5 text-sm text-gold">Good things. Worth remembering.</p>
        </>
      } />
      <div className="mt-6 flex justify-between text-sm">
        {prev ? <Link href={`/newsletter/${prev.id}`} className="text-mute hover:text-ink">← Older</Link> : <span />}
        {next ? <Link href={`/newsletter/${next.id}`} className="text-mute hover:text-ink">Newer →</Link> : <span />}
      </div>
    </div>
  );
}
