"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { saveRec, type SaveState } from "@/app/actions/recs";
import { NEW_ENGLAND, OTHER_STATES } from "@/lib/text";

type Cat = { slug: string; name: string; emoji: string; has_location: number };
type Initial = {
  id?: string; title?: string; category?: string; url?: string | null; image_url?: string | null; site_name?: string | null;
  description?: string | null; why?: string | null; place_name?: string | null; address?: string | null; city?: string | null;
  state?: string | null; country?: string | null; tags?: string[]; links?: string[]; photos?: { id: string; file: string }[];
};
type Similar = { id: string; title: string; author: string | null; emoji: string | null; category: string | null; avg: number | null; count: number; exact: boolean };

/** Shrinks big phone photos before upload so adding a rec stays quick on cellular. */
async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.size < 600_000) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

export function RecForm({ cats, initial = {} }: { cats: Cat[]; initial?: Initial }) {
  const editing = Boolean(initial.id);
  const [state, action, pending] = useActionState<SaveState, FormData>(saveRec, {});
  const [url, setUrl] = useState(initial.url || "");
  const [title, setTitle] = useState(initial.title || "");
  const [category, setCategory] = useState(initial.category || "");
  const [image, setImage] = useState(initial.image_url || "");
  const [siteName, setSiteName] = useState(initial.site_name || "");
  const [description, setDescription] = useState(initial.description || "");
  const [fetching, setFetching] = useState(false);
  const [fetchNote, setFetchNote] = useState("");
  const [similar, setSimilar] = useState<Similar[]>([]);
  const [more, setMore] = useState(editing);
  const [stars, setStars] = useState(0);
  const [links, setLinks] = useState<string[]>(initial.links?.length ? initial.links : []);
  const [removed, setRemoved] = useState<string[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [usState, setUsState] = useState(initial.state || (initial.country && initial.country !== "US" ? "INTL" : ""));
  const photoInput = useRef<HTMLInputElement>(null);
  const forceRef = useRef<HTMLInputElement>(null);
  const lastFetched = useRef(initial.url || "");

  const cat = cats.find((c) => c.slug === category);
  const showLocation = Boolean(cat?.has_location || initial.city || initial.place_name || initial.state);

  async function fetchLink(u: string) {
    const v = u.trim();
    if (!v || v === lastFetched.current || !/\.\w{2,}|^(https?:\/\/)?(\d+\.){3}\d+|localhost/.test(v)) return;
    lastFetched.current = v;
    setFetching(true);
    setFetchNote("");
    try {
      const res = await fetch("/api/unfurl", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: v }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      if (d.title && !title) setTitle(d.title);
      if (d.image && !image) setImage(d.image);
      if (d.description && !description) setDescription(d.description);
      if (d.siteName) setSiteName(d.siteName);
      if (d.category && !category) setCategory(d.category);
      setUrl(d.url);
      setFetchNote(d.title ? "Pulled in what we could find. Tweak anything you like." : "Couldn't read that page, but the link is saved. Fill in a name below.");
    } catch {
      setFetchNote("Couldn't read that link. You can still fill things in by hand.");
    } finally {
      setFetching(false);
    }
  }

  // Look for the same thing already on the site as you type.
  useEffect(() => {
    if (editing) return;
    const t = setTimeout(async () => {
      if (title.trim().length < 3 && !url) return setSimilar([]);
      const res = await fetch(`/api/similar?${new URLSearchParams({ title, url })}`);
      if (res.ok) setSimilar(await res.json());
    }, 350);
    return () => clearTimeout(t);
  }, [title, url, editing]);

  async function onPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files || [])].slice(0, 8);
    const small = await Promise.all(files.map(shrink));
    const dt = new DataTransfer();
    small.forEach((f) => dt.items.add(f));
    if (photoInput.current) photoInput.current.files = dt.files;
    setPreviews(small.map((f) => URL.createObjectURL(f)));
  }

  const dupe = state.duplicate;

  return (
    <form action={action} className="space-y-6">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="force" ref={forceRef} defaultValue="" />
      <input type="hidden" name="image_url" value={image} />
      <input type="hidden" name="site_name" value={siteName} />
      <input type="hidden" name="category" value={category || "other"} />
      {removed.map((id) => <input key={id} type="hidden" name="remove_photo" value={id} />)}

      {dupe && (
        <div className="card border-gold/40 bg-gold/[0.06] p-4">
          <p className="font-medium text-gold">Great minds. This one&apos;s already here.</p>
          <p className="mt-1 text-sm text-soft">{dupe.author ? `${dupe.author.split(" ")[0]} added` : "Someone added"} <span className="text-ink">{dupe.title}</span>. Add your rating or a comment there so it all stays in one place.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={`/r/${dupe.id}`} className="btn-primary">Go to the original</Link>
            <button type="submit" onClick={() => { if (forceRef.current) forceRef.current.value = "1"; }} className="btn-ghost">It&apos;s different, add mine</button>
          </div>
        </div>
      )}

      <div>
        <label className="label" htmlFor="url">Got a link? Paste it and we&apos;ll fill in the details</label>
        <div className="relative">
          <input id="url" name="url" value={url} inputMode="url" autoComplete="off" placeholder="https://…" className="field pr-24"
            onChange={(e) => setUrl(e.target.value)} onBlur={(e) => fetchLink(e.target.value)}
            onPaste={(e) => { const v = e.clipboardData.getData("text"); setTimeout(() => fetchLink(v), 0); }} />
          <button type="button" onClick={() => { lastFetched.current = ""; fetchLink(url); }} className="btn-quiet absolute right-1 top-1/2 h-8 -translate-y-1/2 px-3 text-xs">
            {fetching ? "Looking…" : "Fetch"}
          </button>
        </div>
        {fetchNote && <p className="mt-1.5 text-xs text-mute">{fetchNote}</p>}
      </div>

      {image && (
        <div className="relative overflow-hidden rounded-2xl border border-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" referrerPolicy="no-referrer" className="aspect-[16/9] w-full object-cover" />
          <button type="button" onClick={() => setImage("")} className="absolute right-2 top-2 rounded-full bg-black/60 px-3 py-1 text-xs text-white backdrop-blur">Remove image</button>
        </div>
      )}

      <div>
        <label className="label" htmlFor="title">What is it?</label>
        <input id="title" name="title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Neptune Oyster, Slow Horses, that chili crisp…" className="field py-3 text-[17px]" autoFocus={!editing} />
        {!dupe && similar.length > 0 && (
          <div className="mt-2 rounded-xl border border-line bg-raised/60 p-3">
            <p className="text-xs font-medium text-soft">{similar.some((s) => s.exact) ? "Looks like this might already be here:" : "Similar things already on the site:"}</p>
            <ul className="mt-2 space-y-1.5">
              {similar.slice(0, 3).map((s) => (
                <li key={s.id}>
                  <Link href={`/r/${s.id}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-hover">
                    <span className="truncate">{s.emoji} {s.title} <span className="text-mute">· {s.author?.split(" ")[0]}</span></span>
                    <span className="shrink-0 text-xs text-gold">Rate or comment →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div>
        <span className="label">Category</span>
        <div className="flex flex-wrap gap-2">
          {cats.map((c) => (
            <button type="button" key={c.slug} onClick={() => setCategory(c.slug)} className={`chip ${category === c.slug ? "chip-on" : ""}`} aria-pressed={category === c.slug}>
              {c.emoji} {c.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="why">Why&apos;s it worth a mention?</label>
        <textarea id="why" name="why" rows={3} defaultValue={initial.why || ""} placeholder="Get the lobster roll, skip the fries. Go on a weeknight." className="field resize-y leading-relaxed" />
      </div>

      {!editing && (
        <div>
          <span className="label">Your rating <span className="font-normal text-faint">(optional)</span></span>
          <input type="hidden" name="stars" value={stars || ""} />
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button type="button" key={n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => setStars(stars === n ? 0 : n)} className={`text-[28px] leading-none transition ${n <= stars ? "text-gold" : "text-faint hover:text-mute"}`}>★</button>
            ))}
          </div>
        </div>
      )}

      {showLocation && <LocationFields initial={initial} usState={usState} setUsState={setUsState} />}

      {!more ? (
        <button type="button" onClick={() => setMore(true)} className="btn-quiet -ml-2 text-sm">+ Photos, tags, links{showLocation ? "" : ", location"} and more</button>
      ) : (
        <div className="space-y-6 border-t border-line pt-6">
          <div>
            <span className="label">Photos</span>
            <div className="flex flex-wrap gap-2">
              {initial.photos?.filter((p) => !removed.includes(p.id)).map((p) => (
                <div key={p.id} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/uploads/${p.file}`} alt="" className="size-20 rounded-xl border border-line object-cover" />
                  <button type="button" onClick={() => setRemoved([...removed, p.id])} className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full bg-raised text-xs ring-1 ring-line" aria-label="Remove photo">✕</button>
                </div>
              ))}
              {previews.map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} alt="" className="size-20 rounded-xl border border-gold/40 object-cover" />
              ))}
              <label className="flex size-20 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-line-strong text-xs text-mute transition hover:border-gold/50 hover:text-gold">
                <span className="text-xl">＋</span>Add
                <input ref={photoInput} type="file" name="photos" accept="image/*" multiple className="sr-only" onChange={onPhotos} />
              </label>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="description">Description</label>
            <textarea id="description" name="description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="The official blurb, if you want one." className="field resize-y text-sm leading-relaxed" />
          </div>

          <div>
            <label className="label" htmlFor="tags">Tags</label>
            <input id="tags" name="tags" defaultValue={initial.tags?.join(", ")} placeholder="date night, cozy, worth the drive" className="field" />
            <p className="mt-1.5 text-xs text-faint">Separate with commas.</p>
          </div>

          <div>
            <span className="label">Other links</span>
            <div className="space-y-2">
              {links.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <input name="link" defaultValue={l} inputMode="url" placeholder="https://…" className="field" />
                  <button type="button" className="btn-quiet px-3" onClick={() => setLinks(links.filter((_, j) => j !== i))} aria-label="Remove link">✕</button>
                </div>
              ))}
              <button type="button" onClick={() => setLinks([...links, ""])} className="btn-quiet -ml-2 text-sm">+ Add a link (menu, trailer, reservations…)</button>
            </div>
          </div>

          {!showLocation && <LocationFields initial={initial} usState={usState} setUsState={setUsState} />}
        </div>
      )}

      {state.error && <p className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{state.error}</p>}

      <div className="sticky bottom-20 z-10 -mx-4 flex gap-3 border-t border-line bg-bg/90 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
        <button className="btn-primary flex-1 py-3 text-[15px] md:flex-none md:px-8" disabled={pending}>{pending ? "Saving…" : editing ? "Save changes" : "Save it"}</button>
        <Link href={initial.id ? `/r/${initial.id}` : "/"} className="btn-ghost py-3">Cancel</Link>
      </div>
    </form>
  );
}

function LocationFields({ initial, usState, setUsState }: { initial: Initial; usState: string; setUsState: (s: string) => void }) {
  return (
    <fieldset className="space-y-3">
      <legend className="label">Where is it?</legend>
      <input name="place_name" defaultValue={initial.place_name || ""} placeholder="Place name (if different from the title)" className="field" />
      <input name="address" defaultValue={initial.address || ""} placeholder="Street address" autoComplete="off" className="field" />
      <div className="grid grid-cols-2 gap-3">
        <input name="city" defaultValue={initial.city || ""} placeholder="Town or city" className="field" />
        <select name="state" value={usState} onChange={(e) => setUsState(e.target.value)} className="field" aria-label="State">
          <option value="">State…</option>
          <optgroup label="New England">
            {NEW_ENGLAND.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
          </optgroup>
          <optgroup label="Elsewhere in the US">
            {OTHER_STATES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
          </optgroup>
          <option value="INTL">Outside the US</option>
        </select>
      </div>
      {usState === "INTL" && <input name="country" defaultValue={initial.country && initial.country !== "US" ? initial.country : ""} placeholder="Country" className="field" />}
    </fieldset>
  );
}
