"use client";
import { useOptimistic, useState, useTransition } from "react";
import { rate, toggleInterest, addComment, editComment, deleteComment } from "@/app/actions/recs";
import { Avatar } from "./ui";

const LABELS = ["", "Not for me", "It's fine", "Pretty good", "Really good", "Obsessed"];

export function MyRating({ recId, initial }: { recId: string; initial: number }) {
  const [value, setValue] = useOptimistic(initial);
  const [hover, setHover] = useState(0);
  const [, start] = useTransition();
  const shown = hover || value;
  const set = (n: number) => start(async () => { setValue(n); await rate(recId, n); });
  return (
    <div>
      <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Your rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onMouseEnter={() => setHover(n)} onClick={() => set(value === n ? 0 : n)}
            className={`text-[30px] leading-none transition active:scale-90 ${n <= shown ? "text-gold" : "text-faint hover:text-mute"}`}>★</button>
        ))}
      </div>
      <p className="mt-1 h-4 text-xs text-mute">{shown ? LABELS[shown] : "Tap to rate"}{value && !hover ? " · tap again to clear" : ""}</p>
    </div>
  );
}

export function InterestButton({ recId, on, people, meName }: { recId: string; on: boolean; people: { name: string; image: string | null }[]; meName: string }) {
  const [state, setState] = useOptimistic({ on, people });
  const [, start] = useTransition();
  const click = () =>
    start(async () => {
      setState(state.on ? { on: false, people: state.people.filter((p) => p.name !== meName) } : { on: true, people: [...state.people, { name: meName, image: null }] });
      await toggleInterest(recId);
    });
  return (
    <div>
      <button type="button" onClick={click} aria-pressed={state.on}
        className={`btn w-full border py-2.5 ${state.on ? "border-gold/50 bg-gold/10 text-gold" : "border-line bg-raised text-ink hover:bg-hover"}`}>
        {state.on ? "🙋 You want to try this" : "🙋 I want to try this"}
      </button>
      {state.people.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2">
          {state.people.map((p) => (
            <span key={p.name} className="flex items-center gap-1.5 text-xs text-soft">
              <Avatar name={p.name} image={p.image} size={20} />{p.name.split(" ")[0]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

type C = { id: string; user_id: string | null; body: string; created_at: string; edited_at: string | null; name: string | null; image: string | null; when: string };

export function Comments({ recId, comments, meId, isAdmin, meName, meImage }: { recId: string; comments: C[]; meId: string; isAdmin: boolean; meName: string; meImage: string | null }) {
  const [list, addOptimistic] = useOptimistic(comments, (s, c: C) => [...s, c]);
  const [body, setBody] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setBody("");
    start(async () => {
      addOptimistic({ id: "tmp" + Date.now(), user_id: meId, body: text, created_at: new Date().toISOString(), edited_at: null, name: meName, image: meImage, when: "just now" });
      await addComment(recId, text);
    });
  };

  return (
    <div>
      {list.length === 0 && <p className="mb-4 text-sm text-mute">No comments yet. Been? Going? Have opinions? Start it off.</p>}
      <ul className="space-y-5">
        {list.map((c) => (
          <li key={c.id} className="flex gap-3">
            <Avatar name={c.name} image={c.image} size={32} />
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-medium">{c.name || "Former member"}</span>
                <span className="ml-2 text-xs text-faint">{c.when}{c.edited_at ? " · edited" : ""}</span>
              </p>
              {editing === c.id ? (
                <div className="mt-1.5">
                  <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} className="field text-sm" />
                  <div className="mt-2 flex gap-2">
                    <button type="button" className="btn-primary h-8 px-3 text-xs" onClick={() => start(async () => { await editComment(c.id, draft); setEditing(null); })}>Save</button>
                    <button type="button" className="btn-quiet h-8 px-3 text-xs" onClick={() => setEditing(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-soft">{c.body}</p>
              )}
              {(c.user_id === meId || isAdmin) && editing !== c.id && !c.id.startsWith("tmp") && (
                <div className="mt-1 flex gap-3 text-xs text-faint">
                  {c.user_id === meId && <button type="button" className="hover:text-ink" onClick={() => { setEditing(c.id); setDraft(c.body); }}>Edit</button>}
                  <button type="button" className="hover:text-danger" onClick={() => confirm("Delete this comment?") && start(() => deleteComment(c.id))}>Delete</button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="mt-6 flex items-end gap-3">
        <Avatar name={meName} image={meImage} size={32} className="mb-1 hidden sm:inline-flex" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={1} placeholder="Add a comment…" aria-label="Add a comment"
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(e); }}
          className="field min-h-[46px] flex-1 resize-y text-[15px]" />
        <button className="btn-primary h-[46px]" disabled={pending || !body.trim()}>Post</button>
      </form>
    </div>
  );
}
