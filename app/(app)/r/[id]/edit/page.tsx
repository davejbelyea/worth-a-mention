import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { categories, getRec } from "@/lib/recs";
import { RecForm } from "@/components/RecForm";
import { PageHeader } from "@/components/ui";
import { deleteRec } from "@/app/actions/recs";
import { ConfirmButton } from "@/components/ConfirmButton";

export const metadata = { title: "Edit" };

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireUser();
  const rec = await getRec(id);
  if (!rec) notFound();
  if (rec.created_by !== me.id && me.role !== "admin") redirect(`/r/${id}`);
  const cats = await categories(true);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Edit" title={rec.title} />
      <RecForm
        cats={cats}
        initial={{
          id: rec.id, title: rec.title, category: rec.cat_slug || "other", url: rec.url, image_url: rec.image_url, site_name: rec.site_name,
          description: rec.description, why: rec.why, place_name: rec.place_name, address: rec.address, city: rec.city, state: rec.state,
          country: rec.country, tags: rec.tags, links: rec.links.map((l) => l.url), photos: rec.photos,
        }}
      />
      <form action={deleteRec} className="mt-12 border-t border-line pt-6">
        <input type="hidden" name="id" value={rec.id} />
        <ConfirmButton className="btn-danger" message="Delete this recommendation, with its ratings and comments? This can't be undone.">Delete recommendation</ConfirmButton>
      </form>
    </div>
  );
}
