import { getCurrentUser } from "@/lib/auth";
import { listRecs } from "@/lib/recs";

export async function GET(req: Request) {
  if (!(await getCurrentUser())) return Response.json([], { status: 401 });
  const sp = new URL(req.url).searchParams;
  const recs = await listRecs({ q: sp.get("q") || "", category: sp.get("category") || undefined, limit: 12, sort: sp.get("q") ? "top" : "new" });
  return Response.json(recs.map((r) => ({ id: r.id, title: r.title, emoji: r.cat_emoji, category: r.cat_name, cover: r.cover, author: r.author_name, avg: r.avg_rating, place: [r.city, r.state].filter(Boolean).join(", ") })));
}
