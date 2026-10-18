import { getCurrentUser } from "@/lib/auth";
import { findSimilar } from "@/lib/recs";

export async function GET(req: Request) {
  if (!(await getCurrentUser())) return Response.json([], { status: 401 });
  const sp = new URL(req.url).searchParams;
  const rows = await findSimilar(sp.get("title") || "", sp.get("url"), sp.get("exclude") || undefined);
  return Response.json(rows.map((r) => ({ id: r.id, title: r.title, author: r.author_name, emoji: r.cat_emoji, category: r.cat_name, avg: r.avg_rating, count: r.rating_count, exact: r.exact, created_at: r.created_at })));
}
