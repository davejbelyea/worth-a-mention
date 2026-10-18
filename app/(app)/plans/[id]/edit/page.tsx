import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { PlanForm } from "@/components/PlanForm";
import { PageHeader } from "@/components/ui";
import { deletePlan } from "@/app/actions/plans";
import { ConfirmButton } from "@/components/ConfirmButton";

export default async function EditPlan({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id } = await params;
  const plan = await one<{ id: string; title: string; description: string | null; emoji: string; target_date: string | null; created_by: string }>("SELECT * FROM plans WHERE id = ?", [id]);
  if (!plan) notFound();
  if (plan.created_by !== me.id && me.role !== "admin") redirect(`/plans/${id}`);
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader eyebrow="Edit plan" title={plan.title} />
      <PlanForm plan={plan} />
      <form action={deletePlan} className="mt-12 border-t border-line pt-6">
        <input type="hidden" name="id" value={plan.id} />
        <ConfirmButton className="btn-danger" message="Delete this plan and its votes and comments?">Delete plan</ConfirmButton>
      </form>
    </div>
  );
}
