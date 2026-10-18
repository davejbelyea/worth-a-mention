"use client";
import { useActionState } from "react";
import { requestLink, type LinkState } from "./actions";
import { AUTH_ERRORS } from "@/components/AuthFrame";

export function EmailLinkForm({ next, invite, defaultEmail }: { next?: string; invite?: string; defaultEmail?: string }) {
  const [state, action, pending] = useActionState<LinkState, FormData>(requestLink, {});
  if (state.sentTo) {
    return (
      <div className="card p-5 text-center">
        <div className="text-3xl">📬</div>
        <h2 className="mt-3 font-medium">Check your inbox</h2>
        <p className="mt-1.5 text-sm text-mute">
          We sent a sign-in link to <span className="text-soft">{state.sentTo}</span>. It works once and expires in 20 minutes.
        </p>
        {state.devLink && (
          <a href={state.devLink} className="mt-4 block break-all rounded-lg border border-dashed border-gold/40 bg-gold/5 p-3 text-left text-xs text-gold" data-testid="dev-link">
            Email isn&apos;t set up yet, so here&apos;s the link directly: {state.devLink}
          </a>
        )}
      </div>
    );
  }
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="next" value={next || ""} />
      <input type="hidden" name="invite" value={invite || ""} />
      <label className="sr-only" htmlFor="email">Email</label>
      <input id="email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" defaultValue={defaultEmail} className="field py-3" />
      {state.error && <p className="text-sm text-danger">{AUTH_ERRORS[state.error] || "Something went wrong."}</p>}
      <button className="btn-primary w-full py-3 text-[15px]" disabled={pending}>{pending ? "Sending…" : "Email me a sign-in link"}</button>
    </form>
  );
}
