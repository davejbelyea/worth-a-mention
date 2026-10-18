import { NextResponse, type NextRequest } from "next/server";
import { APP_URL } from "@/lib/config";
import { completeSignIn, createSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const fail = (e: string) => NextResponse.redirect(`${APP_URL}/login?error=${e}`);
  const sp = req.nextUrl.searchParams;
  let saved: { state: string; next: string | null; invite: string | null };
  try {
    saved = JSON.parse(req.cookies.get("wam_oauth")?.value || "");
  } catch {
    return fail("google");
  }
  if (!sp.get("code") || sp.get("state") !== saved.state) return fail("google");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: sp.get("code")!,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${APP_URL}/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) return fail("google");
  const { access_token } = await tokenRes.json();
  const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${access_token}` } });
  if (!infoRes.ok) return fail("google");
  const info: { email?: string; email_verified?: boolean; name?: string; picture?: string } = await infoRes.json();
  if (!info.email || !info.email_verified) return fail("google");

  const r = await completeSignIn({ email: info.email, name: info.name, image: info.picture, inviteToken: saved.invite });
  if (!r.user) {
    const res = fail(r.error || "google");
    res.cookies.delete("wam_oauth");
    return res;
  }
  await createSession(r.user.id);
  const res = NextResponse.redirect(`${APP_URL}${r.created ? "/?welcome=1" : saved.next || "/"}`);
  res.cookies.delete("wam_oauth");
  return res;
}
