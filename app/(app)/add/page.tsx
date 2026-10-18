import { categories } from "@/lib/recs";
import { RecForm } from "@/components/RecForm";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Add a recommendation" };

export default async function AddPage({ searchParams }: { searchParams: Promise<{ title?: string; url?: string; category?: string }> }) {
  const sp = await searchParams;
  const cats = await categories();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="New mention" title="What's worth a mention?" sub="A name is plenty. Everything else is a bonus." />
      <RecForm cats={cats} initial={{ title: sp.title, url: sp.url, category: sp.category }} />
    </div>
  );
}
