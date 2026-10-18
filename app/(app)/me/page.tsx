import { requireUser } from "@/lib/auth";
import { listRecs } from "@/lib/recs";
import { Avatar, PageHeader } from "@/components/ui";
import { RecGrid } from "@/components/RecCard";
import { saveProfile } from "@/app/actions/me";

export const metadata = { title: "You" };

export default async function Me({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const me = await requireUser();
  const { saved } = await searchParams;
  const mine = await listRecs({ by: me.id, limit: 60 });
  return (
    <div>
      <PageHeader eyebrow="Your profile" title={me.name} sub={`${mine.length} ${mine.length === 1 ? "thing" : "things"} you've mentioned`} />
      <div className="grid gap-10 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <form action={saveProfile} className="card space-y-5 p-5">
            {saved && <p className="text-sm text-gold">Saved.</p>}
            <div className="flex items-center gap-4">
              <Avatar name={me.name} image={me.image} size={56} />
              <label className="btn-ghost cursor-pointer text-xs">Change photo<input type="file" name="photo" accept="image/*" className="sr-only" /></label>
            </div>
            <div>
              <label className="label" htmlFor="name">Name</label>
              <input id="name" name="name" defaultValue={me.name} className="field" />
            </div>
            <p className="text-xs text-mute">Signed in as {me.email}</p>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" name="email_digest" defaultChecked={Boolean(me.email_digest)} className="mt-0.5 size-4 accent-[#e8b86a]" />
              <span>Email me the Thursday newsletter<span className="block text-xs text-mute">It&apos;s always in the archive either way.</span></span>
            </label>
            <button className="btn-primary w-full">Save</button>
          </form>
          <form action="/auth/signout" method="post">
            <button className="btn-quiet w-full">Sign out</button>
          </form>
        </div>
        <div>
          {mine.length ? <RecGrid recs={mine} /> : <p className="text-sm text-mute">You haven&apos;t added anything yet. Surely you&apos;ve eaten somewhere good lately.</p>}
        </div>
      </div>
    </div>
  );
}
