import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { previewDigest } from "@/lib/digest";
import { DigestView } from "@/components/DigestView";
import { formatDay } from "@/lib/time";

export const metadata = { title: "Newsletter preview" };

export default async function Preview() {
  await requireAdmin();
  const p = await previewDigest();
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin?tab=newsletter" className="mb-4 inline-block text-sm text-mute hover:text-ink">← Newsletter settings</Link>
      <p className="mb-4 rounded-xl border border-dashed border-line-strong p-3 text-sm text-mute">Preview only. This is what the edition would look like if it went out right now. Subject line: <span className="text-soft">{p.subject}</span></p>
      <DigestView data={p.data} header={
        <>
          <div className="text-xs text-mute">{formatDay(p.issueDate, { weekday: "long", month: "long", day: "numeric" })}</div>
          <h1 className="mt-2 font-display text-[40px] leading-none tracking-tight">Worth a Mention</h1>
          <p className="mt-1.5 text-sm text-gold">Good things. Worth remembering.</p>
        </>
      } />
    </div>
  );
}
