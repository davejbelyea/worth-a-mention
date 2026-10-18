"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { run } from "@/lib/db";
import { saveUpload } from "@/lib/uploads";

export async function saveProfile(f: FormData) {
  const me = await requireUser();
  const name = String(f.get("name") || "").trim().slice(0, 60);
  if (name) await run("UPDATE users SET name = ? WHERE id = ?", [name, me.id]);
  await run("UPDATE users SET email_digest = ? WHERE id = ?", [f.get("email_digest") ? 1 : 0, me.id]);
  const photo = f.get("photo");
  if (photo instanceof File && photo.size) {
    const file = await saveUpload(photo);
    if (file) await run("UPDATE users SET image = ? WHERE id = ?", [`/uploads/${file}`, me.id]);
  }
  revalidatePath("/", "layout");
  redirect("/me?saved=1");
}
