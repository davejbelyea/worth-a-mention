"use server";
import { redirect } from "next/navigation";
import { sendMagicLink } from "@/lib/auth";

export type LinkState = { error?: string; sentTo?: string; devLink?: string };

export async function requestLink(_: LinkState, form: FormData): Promise<LinkState> {
  const email = String(form.get("email") || "");
  const next = String(form.get("next") || "") || null;
  const invite = String(form.get("invite") || "") || null;
  const r = await sendMagicLink(email, next, invite);
  if (!r.ok) return { error: r.reason };
  return { sentTo: email.trim().toLowerCase(), devLink: r.devLink };
}

export async function goHome() {
  redirect("/");
}
