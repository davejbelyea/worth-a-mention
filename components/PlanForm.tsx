import Link from "next/link";
import { savePlan } from "@/app/actions/plans";

const EMOJI = ["🗓️", "🍽️", "🍿", "🧭", "🏖️", "🍷", "🎶", "🏔️", "🛶", "🎉", "☕", "🍕"];
const IDEAS = ["Next Dinner Out", "Weekend Trip Ideas", "Next Movie Night", "Brunch Spot", "Summer Getaway"];

export function PlanForm({ plan, rec }: { plan?: { id: string; title: string; description: string | null; emoji: string; target_date: string | null }; rec?: string }) {
  return (
    <form action={savePlan} className="space-y-6">
      {plan && <input type="hidden" name="id" value={plan.id} />}
      {rec && <input type="hidden" name="rec" value={rec} />}
      <div>
        <label className="label" htmlFor="title">Name it</label>
        <input id="title" name="title" required defaultValue={plan?.title} placeholder="Next Dinner Out" className="field py-3 text-[17px]" list="plan-ideas" autoFocus={!plan} />
        <datalist id="plan-ideas">{IDEAS.map((i) => <option key={i} value={i} />)}</datalist>
      </div>
      <fieldset>
        <legend className="label">Pick an emoji</legend>
        <div className="flex flex-wrap gap-2">
          {EMOJI.map((e, i) => (
            <label key={e} className="cursor-pointer">
              <input type="radio" name="emoji" value={e} defaultChecked={plan ? plan.emoji === e : i === 0} className="peer sr-only" />
              <span className="flex size-11 items-center justify-center rounded-xl border border-line bg-raised text-xl transition peer-checked:border-gold/60 peer-checked:bg-gold/10">{e}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label className="label" htmlFor="target_date">When? <span className="font-normal text-faint">(optional)</span></label>
        <input id="target_date" type="date" name="target_date" defaultValue={plan?.target_date || ""} className="field" />
      </div>
      <div>
        <label className="label" htmlFor="description">Details <span className="font-normal text-faint">(optional)</span></label>
        <textarea id="description" name="description" rows={3} defaultValue={plan?.description || ""} placeholder="Saturday the 8th-ish. Somewhere we can actually hear each other." className="field" />
      </div>
      <div className="flex gap-3">
        <button className="btn-primary px-8 py-3">{plan ? "Save" : "Create plan"}</button>
        <Link href={plan ? `/plans/${plan.id}` : "/plans"} className="btn-ghost py-3">Cancel</Link>
      </div>
    </form>
  );
}
