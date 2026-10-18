"use server";
import { redirect } from "next/navigation";
import { completeSignIn, consumeMagicLink, createSession } from "@/lib/auth";

export async function verifyLink(form: FormData) {
  const t = String(form.get("token") || "");
  const { email, next, invite } = await consumeMagicLink(t);
  if (!email) redirect("/login?error=expired");
  const r = await completeSignIn({ email, inviteToken: invite });
  if (!r.user) redirect(`/login?error=${r.error}`);
  await createSession(r.user.id);
  redirect(r.created ? "/?welcome=1" : next || "/");
}
