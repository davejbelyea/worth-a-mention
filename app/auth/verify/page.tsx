import { AuthFrame } from "@/components/AuthFrame";
import { verifyLink } from "./actions";

export const metadata = { title: "Sign in" };

// A button press (rather than signing in on page load) keeps email link scanners from using up the link.
export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthFrame>
      <form action={verifyLink} className="card p-6 text-center">
        <input type="hidden" name="token" value={token || ""} />
        <p className="text-[15px] text-soft">One tap and you&apos;re in.</p>
        <button className="btn-primary mt-5 w-full py-3 text-[15px]">Sign me in</button>
      </form>
    </AuthFrame>
  );
}
