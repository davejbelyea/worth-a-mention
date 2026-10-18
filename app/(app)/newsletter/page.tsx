import Link from "next/link";
import { all, getSetting } from "@/lib/db";
import { Empty, PageHeader, SampleBadge } from "@/components/ui";
import { formatDay, formatTime12 } from "@/lib/time";
import type { DigestData } from "@/lib/digest";

export const metadata = { title: "The Thursday newsletter" };

export default async function NewsletterArchive() {
  const [issues, time, enabled] = await Promise.all([
    all<{ id: string; edition: number; issue_date: string; subject: string; data: string; is_sample: number }>("SELECT id, edition, issue_date, subject, data, is_sample FROM newsletters ORDER BY issue_date DESC"),
    getSetting("digest_time"),
    getSetting("digest_enabled"),
  ]);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="The archive" title="The Thursday edition"
        sub={enabled === "1" ? `A quick roundup of the week, in your inbox every Thursday at ${formatTime12(time || "08:00")} Eastern.` : "The weekly email is paused for now. Past editions live here."} />
      {issues.length ? (
        <div className="card divide-y divide-line">
          {issues.map((n) => {
            let d: DigestData | null = null;
            try { d = JSON.parse(n.data); } catch {}
            return (
              <Link key={n.id} href={`/newsletter/${n.id}`} className="flex items-center gap-4 p-4 transition hover:bg-raised/50 sm:p-5">
                <div className="w-14 shrink-0 text-center">
                  <div className="text-[11px] uppercase tracking-wider text-mute">{formatDay(n.issue_date, { month: "short" })}</div>
                  <div className="font-display text-3xl leading-none">{formatDay(n.issue_date, { day: "numeric" })}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{n.subject.replace(/^Worth a Mention · [^:]+: /, "")}</p>
                  <p className="mt-0.5 text-xs text-mute">No. {n.edition}{d ? ` · ${d.stats.recs} new · ${d.stats.comments} comments` : ""}</p>
                </div>
                {n.is_sample ? <SampleBadge /> : <span className="text-mute">→</span>}
              </Link>
            );
          })}
        </div>
      ) : (
        <Empty emoji="📮" title="The first edition is on its way">Come Thursday, this is where every edition will live.</Empty>
      )}
    </div>
  );
}
