export function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-12">
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-gold/[0.07] blur-3xl" />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl border border-line bg-surface">
            <Logo className="size-8" />
          </div>
          <h1 className="font-display text-[40px] leading-none tracking-tight">Worth a Mention</h1>
          <p className="mt-3 text-sm text-mute">Good things. Worth remembering.</p>
        </div>
        {children}
      </div>
    </main>
  );
}

export function Logo({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="16 18 36 34" className={className} aria-hidden>
      <path d="M20 22h24a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H31l-8 6v-6h-3a4 4 0 0 1-4-4V26a4 4 0 0 1 4-4z" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" className="text-gold" />
      <path d="M32 27.5l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" className="fill-gold" />
    </svg>
  );
}

export function GoogleButton({ href }: { href: string }) {
  return (
    <a href={href} className="btn-ghost w-full py-3 text-[15px]">
      <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
        <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8z" />
        <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z" />
        <path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8z" />
        <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z" />
      </svg>
      Continue with Google
    </a>
  );
}

export const AUTH_ERRORS: Record<string, string> = {
  "not-invited": "That address isn't on the guest list yet. Ask the group's founder for an invite.",
  removed: "This account isn't active anymore. If that's a mistake, check with the group's founder.",
  expired: "That link has expired or was already used. Request a fresh one below.",
  google: "Google sign-in didn't go through. Give it another try.",
  "google-off": "Google sign-in isn't set up yet. Use an email link for now.",
  invalid: "That doesn't look like an email address.",
  "too-many": "That's a lot of sign-in links. Wait a little while and try again.",
};
