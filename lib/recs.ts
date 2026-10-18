import type { InValue } from "@libsql/client";
import { all, one } from "./db";
import { NE_CODES, titleKey, urlKey } from "./text";

export type Category = { id: string; slug: string; name: string; emoji: string; sort: number; has_location: number; archived: number };

export type RecCard = {
  id: string;
  title: string;
  why: string | null;
  description: string | null;
  url: string | null;
  image_url: string | null;
  cover: string | null;
  site_name: string | null;
  place_name: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  created_at: string;
  is_sample: number;
  created_by: string | null;
  author_name: string | null;
  author_image: string | null;
  cat_slug: string | null;
  cat_name: string | null;
  cat_emoji: string | null;
  avg_rating: number | null;
  rating_count: number;
  comment_count: number;
  interest_count: number;
  tags: string | null;
};

export async function categories(includeArchived = false) {
  return all<Category>(`SELECT * FROM categories ${includeArchived ? "" : "WHERE archived = 0"} ORDER BY sort, name`);
}

const CARD_SELECT = `
  SELECT r.id, r.title, r.why, r.description, r.url, r.image_url, r.site_name, r.place_name, r.city, r.state, r.country,
    r.created_at, r.is_sample, r.created_by,
    COALESCE(r.image_url, (SELECT '/uploads/' || p.file FROM rec_photos p WHERE p.rec_id = r.id ORDER BY p.sort, p.created_at LIMIT 1)) AS cover,
    u.name AS author_name, u.image AS author_image,
    c.slug AS cat_slug, c.name AS cat_name, c.emoji AS cat_emoji,
    (SELECT AVG(stars) FROM ratings WHERE rec_id = r.id) AS avg_rating,
    (SELECT COUNT(*) FROM ratings WHERE rec_id = r.id) AS rating_count,
    (SELECT COUNT(*) FROM comments WHERE rec_id = r.id) AS comment_count,
    (SELECT COUNT(*) FROM interests WHERE rec_id = r.id) AS interest_count,
    (SELECT GROUP_CONCAT(tag, ',') FROM rec_tags WHERE rec_id = r.id) AS tags
  FROM recs r
  LEFT JOIN users u ON u.id = r.created_by
  LEFT JOIN categories c ON c.id = r.category_id`;

export type RecFilters = {
  q?: string;
  category?: string;
  by?: string;
  minRating?: number;
  where?: string; // "ne" | state code | "elsewhere"
  tag?: string;
  sort?: "new" | "top" | "talked" | "wanted" | "old";
  limit?: number;
  offset?: number;
};

export async function listRecs(f: RecFilters = {}): Promise<RecCard[]> {
  const where: string[] = [];
  const args: InValue[] = [];
  if (f.q?.trim()) {
    const like = `%${f.q.trim().replace(/[%_]/g, "")}%`;
    where.push(`(r.title LIKE ? OR r.why LIKE ? OR r.description LIKE ? OR r.place_name LIKE ? OR r.city LIKE ? OR r.site_name LIKE ?
      OR EXISTS (SELECT 1 FROM rec_tags t WHERE t.rec_id = r.id AND t.tag LIKE ?)
      OR EXISTS (SELECT 1 FROM comments cm WHERE cm.rec_id = r.id AND cm.body LIKE ?))`);
    args.push(like, like, like, like, like, like, like, like);
  }
  if (f.category) {
    where.push("c.slug = ?");
    args.push(f.category);
  }
  if (f.by) {
    where.push("r.created_by = ?");
    args.push(f.by);
  }
  if (f.tag) {
    where.push("EXISTS (SELECT 1 FROM rec_tags t WHERE t.rec_id = r.id AND t.tag = ?)");
    args.push(f.tag.toLowerCase());
  }
  if (f.where === "ne") {
    where.push(`r.state IN (${NE_CODES.map(() => "?").join(",")})`);
    args.push(...NE_CODES);
  } else if (f.where === "elsewhere") {
    where.push(`(r.state IS NOT NULL OR r.country IS NOT NULL) AND (r.state IS NULL OR r.state NOT IN (${NE_CODES.map(() => "?").join(",")}))`);
    args.push(...NE_CODES);
  } else if (f.where) {
    where.push("r.state = ?");
    args.push(f.where);
  }
  const having = f.minRating ? `WHERE avg_rating >= ${Number(f.minRating)}` : "";
  const order =
    f.sort === "top" ? "avg_rating IS NULL, avg_rating DESC, rating_count DESC"
    : f.sort === "talked" ? "comment_count DESC, created_at DESC"
    : f.sort === "wanted" ? "interest_count DESC, created_at DESC"
    : f.sort === "old" ? "created_at ASC"
    : "created_at DESC";
  const sql = `SELECT * FROM (${CARD_SELECT} ${where.length ? "WHERE " + where.join(" AND ") : ""}) ${having}
    ORDER BY ${order} LIMIT ${Number(f.limit ?? 60)} OFFSET ${Number(f.offset ?? 0)}`;
  return all<RecCard>(sql, args);
}

export async function recCardsByIds(ids: string[]) {
  if (!ids.length) return [];
  const rows = await all<RecCard>(`${CARD_SELECT} WHERE r.id IN (${ids.map(() => "?").join(",")})`, ids);
  return ids.map((id) => rows.find((r) => r.id === id)).filter(Boolean) as RecCard[];
}

export async function getRec(id: string) {
  const rec = await one<RecCard & { address: string | null; category_id: string | null; updated_at: string; cat_has_location: number }>(
    CARD_SELECT.replace("c.emoji AS cat_emoji,", "c.emoji AS cat_emoji, c.has_location AS cat_has_location, r.address, r.category_id, r.updated_at,") + " WHERE r.id = ?",
    [id],
  );
  if (!rec) return null;
  const [photos, links, tags, ratings, comments, interested, plans] = await Promise.all([
    all<{ id: string; file: string; added_by: string | null }>("SELECT * FROM rec_photos WHERE rec_id = ? ORDER BY sort, created_at", [id]),
    all<{ id: string; url: string; label: string | null }>("SELECT * FROM rec_links WHERE rec_id = ?", [id]),
    all<{ tag: string }>("SELECT tag FROM rec_tags WHERE rec_id = ? ORDER BY tag", [id]),
    all<{ user_id: string; stars: number; updated_at: string; name: string; image: string | null }>(
      "SELECT r.*, u.name, u.image FROM ratings r JOIN users u ON u.id = r.user_id WHERE r.rec_id = ? ORDER BY r.stars DESC, u.name", [id]),
    all<{ id: string; user_id: string | null; body: string; created_at: string; edited_at: string | null; name: string | null; image: string | null; is_sample: number }>(
      "SELECT c.*, u.name, u.image FROM comments c LEFT JOIN users u ON u.id = c.user_id WHERE c.rec_id = ? ORDER BY c.created_at", [id]),
    all<{ user_id: string; name: string; image: string | null; created_at: string }>(
      "SELECT i.user_id, i.created_at, u.name, u.image FROM interests i JOIN users u ON u.id = i.user_id WHERE i.rec_id = ? ORDER BY i.created_at", [id]),
    all<{ id: string; title: string; emoji: string; status: string }>(
      "SELECT p.id, p.title, p.emoji, p.status FROM plan_items pi JOIN plans p ON p.id = pi.plan_id WHERE pi.rec_id = ? ORDER BY p.created_at DESC", [id]),
  ]);
  return { ...rec, photos, links, tags: tags.map((t) => t.tag), ratings, comments, interested, plans };
}

export type FullRec = NonNullable<Awaited<ReturnType<typeof getRec>>>;

/** Recommendations that look like the same thing (same link or same-ish name). */
export async function findSimilar(title: string, url?: string | null, excludeId?: string) {
  const tk = titleKey(title || "");
  const uk = urlKey(url);
  if (tk.length < 3 && !uk) return [];
  const conds: string[] = [];
  const args: InValue[] = [];
  if (uk) {
    conds.push("r.url_key = ?");
    args.push(uk);
  }
  if (tk.length >= 3) {
    conds.push("r.title_key = ?", "r.title_key LIKE ?");
    args.push(tk, `${tk}%`);
    if (tk.length >= 5) {
      conds.push("r.title_key LIKE ?");
      args.push(`%${tk}%`);
    }
  }
  const rows = await all<RecCard & { title_key: string; url_key: string | null }>(
    `${CARD_SELECT.replace("SELECT r.id,", "SELECT r.title_key, r.url_key, r.id,")} WHERE (${conds.join(" OR ")}) ${excludeId ? "AND r.id != ?" : ""} ORDER BY r.created_at LIMIT 5`,
    excludeId ? [...args, excludeId] : args,
  );
  return rows.map((r) => ({ ...r, exact: (uk && r.url_key === uk) || r.title_key === tk }));
}

export async function popularTags(limit = 24) {
  return all<{ tag: string; n: number }>("SELECT tag, COUNT(*) AS n FROM rec_tags GROUP BY tag ORDER BY n DESC, tag LIMIT ?", [limit]);
}

export async function contributors() {
  return all<{ id: string; name: string; image: string | null; n: number }>(
    "SELECT u.id, u.name, u.image, COUNT(r.id) AS n FROM users u JOIN recs r ON r.created_by = u.id GROUP BY u.id ORDER BY u.name COLLATE NOCASE",
  );
}
