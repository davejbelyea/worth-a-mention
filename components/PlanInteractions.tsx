"use client";
import { useEffect, useOptimistic, useState, useTransition } from "react";
import { toggleVote, addToPlan, removeFromPlan, decidePlan, addPlanComment, deletePlanComment } from "@/app/actions/plans";
import { Avatar, AvatarStack } from "./ui";

type Voter = { name: string; image: string | null };

export function VoteButton({ itemId, voted, voters, meName, disabled }: { itemId: string; voted: boolean; voters: Voter[]; meName: string; disabled?: boolean }) {
  const [s, set] = useOptimistic({ voted, voters });
  const [, start] = useTransition();
  return (
    <div className="flex items-center gap-2.5">
      {s.voters.length > 0 && <span className="hidden sm:inline-flex"><AvatarStack people={s.voters} max={4} size={22} /></span>}
      <button type="button" disabled={disabled} aria-pressed={s.voted}
        onClick={() => start(async () => {
          set(s.voted ? { voted: false, voters: s.voters.filter((v) => v.name !== meName) } : { voted: true, voters: [...s.voters, { name: meName, image: null }] });
          await toggleVote(itemId);
        })}
        className={`inline-flex h-9 min-w-[76px] items-center justify-center gap-1.5 rounded-full border px-3 text-sm font-medium tabular-nums transition active:scale-95 disabled:opacity-60 ${
          s.voted ? "border-vote/60 bg-vote/15 text-vote" : "border-line bg-raised text-soft hover:border-vote/40 hover:text-vote"}`}>
        <span aria-hidden>{s.voted ? "✓" : "＋"}</span>
        <span>{s.voters.length}</span>
        <span className="sr-only">{s.voted ? "Remove your vote" : "Vote for this"}</span>
      </button>
    </div>
  );
}

export function RemoveItem({ itemId }: { itemId: string }) {
  const [, start] = useTransition();
  return <button type="button" className="text-xs text-faint hover:text-danger" onClick={() => confirm("Take this option off the list?") && start(() => removeFromPlan(itemId))}>Remove</button>;
}

export function DecideButton({ planId, itemId, label = "Lock it in" }: { planId: string; itemId: string | null; label?: string }) {
  const [pending, start] = useTransition();
  return <button type="button" disabled={pending} className={`whitespace-nowrap ${itemId ? "btn-ghost h-7 px-2.5 text-xs" : "btn-quiet h-8 px-3 text-xs"}`} onClick={() => start(() => decidePlan(planId, itemId))}>{label}</button>;
}

type Hit = { id: string; title: string; emoji: string | null; category: string | null; cover: string | null; author: string | null; place: string };

export function AddOption({ planId, existing }: { planId: string; existing: string[] }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState<string[]>([]);
  const [, start] = useTransition();
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (r.ok) setHits(await r.json());
    }, 200);
    return () => clearTimeout(t);
  }, [q, open]);
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="btn-ghost w-full py-3">＋ Add an option from the site</button>;
  return (
    <div className="card p-3">
      <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search recommendations…" className="field" aria-label="Search recommendations to add" />
      <ul className="mt-2 max-h-80 overflow-y-auto">
        {hits.map((h) => {
          const on = existing.includes(h.id) || added.includes(h.id);
          return (
            <li key={h.id}>
              <button type="button" disabled={on} onClick={() => start(async () => { setAdded([...added, h.id]); await addToPlan(planId, h.id); })}
                className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-raised disabled:opacity-50">
                <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-raised text-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {h.cover ? <img src={h.cover} alt="" referrerPolicy="no-referrer" className="size-full object-cover" /> : h.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{h.title}</span>
                  <span className="block truncate text-xs text-mute">{h.emoji} {h.category}{h.place ? ` · ${h.place}` : ""}</span>
                </span>
                <span className="text-xs text-gold">{on ? "On the list" : "Add"}</span>
              </button>
            </li>
          );
        })}
        {hits.length === 0 && <li className="p-3 text-sm text-mute">Nothing found. Add it to the site first, then pop back here.</li>}
      </ul>
      <button type="button" onClick={() => { setOpen(false); setQ(""); }} className="btn-quiet mt-1 w-full text-sm">Done</button>
    </div>
  );
}

type PC = { id: string; user_id: string | null; body: string; name: string | null; image: string | null; when: string };

export function PlanComments({ planId, comments, meId, isAdmin, meName, meImage }: { planId: string; comments: PC[]; meId: string; isAdmin: boolean; meName: string; meImage: string | null }) {
  const [list, add] = useOptimistic(comments, (s, c: PC) => [...s, c]);
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setBody("");
    start(async () => {
      add({ id: "tmp" + Date.now(), user_id: meId, body: text, name: meName, image: meImage, when: "just now" });
      await addPlanComment(planId, text);
    });
  };
  return (
    <div>
      {list.length === 0 && <p className="mb-4 text-sm text-mute">Hash it out here. Who&apos;s driving, who&apos;s booking, who vetoed sushi again.</p>}
      <ul className="space-y-5">
        {list.map((c) => (
          <li key={c.id} className="flex gap-3">
            <Avatar name={c.name} image={c.image} size={32} />
            <div className="min-w-0 flex-1">
              <p className="text-sm"><span className="font-medium">{c.name || "Former member"}</span><span className="ml-2 text-xs text-faint">{c.when}</span></p>
              <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-soft">{c.body}</p>
              {(c.user_id === meId || isAdmin) && !c.id.startsWith("tmp") && (
                <button type="button" className="mt-1 text-xs text-faint hover:text-danger" onClick={() => confirm("Delete this comment?") && start(() => deletePlanComment(c.id))}>Delete</button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="mt-6 flex items-end gap-3">
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={1} placeholder="Say something about the plan…" aria-label="Comment on this plan" className="field min-h-[46px] flex-1 resize-y text-[15px]" />
        <button className="btn-primary h-[46px]" disabled={pending || !body.trim()}>Post</button>
      </form>
    </div>
  );
}
