import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { APP_URL, GOOGLE_ENABLED } from "@/lib/config";
import { safeNext } from "@/lib/auth";

export async function GET(req: NextRequest) {
  if (!GOOGLE_ENABLED) return NextResponse.redirect(`${APP_URL}/login?error=google-off`);
  const state = crypto.randomBytes(16).toString("base64url");
  const sp = req.nextUrl.searchParams;
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${APP_URL}/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  const res = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  res.cookies.set("wam_oauth", JSON.stringify({ state, next: safeNext(sp.get("next")), invite: sp.get("invite") || null }), {
    httpOnly: true, sameSite: "lax", secure: APP_URL.startsWith("https://"), path: "/", maxAge: 600,
  });
  return res;
}
