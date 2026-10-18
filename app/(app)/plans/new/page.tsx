import { PlanForm } from "@/components/PlanForm";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "New plan" };

export default async function NewPlan({ searchParams }: { searchParams: Promise<{ rec?: string }> }) {
  const { rec } = await searchParams;
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader eyebrow="New plan" title="What are we planning?" sub="Everyone can add options and vote." />
      <PlanForm rec={rec} />
    </div>
  );
}
