"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { addToPlan } from "@/app/actions/plans";

export function AddToPlan({ recId, plans, already }: { recId: string; plans: { id: string; title: string; emoji: string }[]; already: string[] }) {
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState<string[]>(already);
  const [, start] = useTransition();
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)} className="btn-ghost w-full" aria-expanded={open}>🗓️ Add to a plan</button>
      {open && (
        <div className="card absolute inset-x-0 top-full z-20 mt-2 overflow-hidden p-1.5 shadow-2xl shadow-black/50">
          {plans.map((p) => {
            const on = added.includes(p.id);
            return (
              <button key={p.id} type="button" disabled={on}
                onClick={() => start(async () => { setAdded([...added, p.id]); await addToPlan(p.id, recId); })}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-raised disabled:opacity-60">
                <span className="truncate">{p.emoji} {p.title}</span>
                <span className="text-xs text-mute">{on ? "Added ✓" : "Add"}</span>
              </button>
            );
          })}
          <Link href={`/plans/new?rec=${recId}`} className="block rounded-lg px-3 py-2.5 text-sm text-gold hover:bg-raised">+ Start a new plan with this</Link>
        </div>
      )}
    </div>
  );
}
