import { getCurrentUser } from "@/lib/auth";
import { unfurl } from "@/lib/unfurl";

export async function POST(req: Request) {
  if (!(await getCurrentUser())) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { url } = await req.json().catch(() => ({}));
  const data = url ? await unfurl(String(url)) : null;
  if (!data) return Response.json({ error: "That doesn't look like a link." }, { status: 400 });
  return Response.json(data);
}
