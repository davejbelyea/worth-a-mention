import { redirect } from "next/navigation";
import { AuthFrame, GoogleButton, AUTH_ERRORS } from "@/components/AuthFrame";
import { getCurrentUser, safeNext } from "@/lib/auth";
import { GOOGLE_ENABLED } from "@/lib/config";
import { EmailLinkForm } from "./EmailLinkForm";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  if (await getCurrentUser()) redirect(safeNext(sp.next) || "/");
  const next = safeNext(sp.next) || "";
  return (
    <AuthFrame>
      <div className="space-y-4">
        {sp.error && <p className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{AUTH_ERRORS[sp.error] || "Something went wrong. Try again."}</p>}
        {GOOGLE_ENABLED && (
          <>
            <GoogleButton href={`/auth/google${next ? `?next=${encodeURIComponent(next)}` : ""}`} />
            <div className="flex items-center gap-3 text-xs text-faint"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
          </>
        )}
        <EmailLinkForm next={next} />
        <p className="pt-4 text-center text-xs leading-relaxed text-faint">Members only. New here? You&apos;ll need an invite from the group&apos;s founder.</p>
      </div>
    </AuthFrame>
  );
}
