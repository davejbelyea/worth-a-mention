import { AuthFrame, GoogleButton } from "@/components/AuthFrame";
import { EmailLinkForm } from "@/app/login/EmailLinkForm";
import { findOpenInvite, getCurrentUser } from "@/lib/auth";
import { GOOGLE_ENABLED } from "@/lib/config";
import Link from "next/link";

export const metadata = { title: "You're invited" };

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await findOpenInvite(token);
  const me = await getCurrentUser();
  if (!invite) {
    return (
      <AuthFrame>
        <div className="card p-6 text-center">
          <div className="text-3xl">🎟️</div>
          <h2 className="mt-3 font-medium">This invite isn&apos;t valid anymore</h2>
          <p className="mt-2 text-sm text-mute">It may have expired, been used already, or been cancelled. Ask whoever invited you for a fresh one.</p>
          <Link href={me ? "/" : "/login"} className="btn-ghost mt-5">{me ? "Go to the site" : "Go to sign in"}</Link>
        </div>
      </AuthFrame>
    );
  }
  return (
    <AuthFrame>
      <div className="card mb-5 p-5">
        <p className="eyebrow text-gold">You&apos;re invited</p>
        <p className="mt-2 text-[15px] leading-relaxed text-soft">
          {invite.name ? <><span className="text-ink">{invite.name}</span>, </> : null}
          <span className="text-ink">{invite.inviter_name || "The group"}</span> saved you a seat. This is where the group keeps the restaurants, shows, recipes and trips that come up in conversation, so nobody has to remember them.
        </p>
      </div>
      <div className="space-y-4">
        {GOOGLE_ENABLED && (
          <>
            <GoogleButton href={`/auth/google?invite=${encodeURIComponent(token)}`} />
            <div className="flex items-center gap-3 text-xs text-faint"><span className="h-px flex-1 bg-line" />or use email<span className="h-px flex-1 bg-line" /></div>
          </>
        )}
        <EmailLinkForm invite={token} defaultEmail={invite.email} />
      </div>
    </AuthFrame>
  );
}
