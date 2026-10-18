import crypto from "node:crypto";

// Database schema, shared by the app and the setup/seed scripts.
// Everything uses CREATE ... IF NOT EXISTS so it is safe to run on every boot.

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  image TEXT,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'active',
  bio TEXT,
  email_digest INTEGER NOT NULL DEFAULT 1,
  is_sample INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  last_seen_at TEXT
);

CREATE TABLE IF NOT EXISTS invites (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE,
  name TEXT,
  token TEXT NOT NULL UNIQUE,
  invited_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  accepted_at TEXT,
  revoked_at TEXT
);

CREATE TABLE IF NOT EXISTS login_tokens (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE,
  next_path TEXT,
  invite_token TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '✨',
  sort INTEGER NOT NULL DEFAULT 0,
  has_location INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS recs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  title_key TEXT NOT NULL,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  url TEXT,
  url_key TEXT,
  image_url TEXT,
  site_name TEXT,
  description TEXT,
  why TEXT,
  place_name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  is_sample INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS recs_created ON recs(created_at DESC);
CREATE INDEX IF NOT EXISTS recs_title_key ON recs(title_key);
CREATE INDEX IF NOT EXISTS recs_url_key ON recs(url_key);

CREATE TABLE IF NOT EXISTS rec_photos (
  id TEXT PRIMARY KEY,
  rec_id TEXT NOT NULL REFERENCES recs(id) ON DELETE CASCADE,
  file TEXT NOT NULL,
  added_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rec_links (
  id TEXT PRIMARY KEY,
  rec_id TEXT NOT NULL REFERENCES recs(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  label TEXT
);

CREATE TABLE IF NOT EXISTS rec_tags (
  rec_id TEXT NOT NULL REFERENCES recs(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  PRIMARY KEY (rec_id, tag)
);
CREATE INDEX IF NOT EXISTS rec_tags_tag ON rec_tags(tag);

CREATE TABLE IF NOT EXISTS ratings (
  rec_id TEXT NOT NULL REFERENCES recs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (rec_id, user_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  rec_id TEXT NOT NULL REFERENCES recs(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  is_sample INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  edited_at TEXT
);
CREATE INDEX IF NOT EXISTS comments_rec ON comments(rec_id, created_at);

CREATE TABLE IF NOT EXISTS interests (
  rec_id TEXT NOT NULL REFERENCES recs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (rec_id, user_id)
);

CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  emoji TEXT NOT NULL DEFAULT '🗓️',
  target_date TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  decided_item_id TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  is_sample INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plan_items (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  rec_id TEXT NOT NULL REFERENCES recs(id) ON DELETE CASCADE,
  note TEXT,
  added_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  UNIQUE (plan_id, rec_id)
);

CREATE TABLE IF NOT EXISTS plan_votes (
  item_id TEXT NOT NULL REFERENCES plan_items(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (item_id, user_id)
);

CREATE TABLE IF NOT EXISTS plan_comments (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  is_sample INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS newsletters (
  id TEXT PRIMARY KEY,
  edition INTEGER NOT NULL,
  issue_date TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  data TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  is_sample INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  sent_at TEXT,
  sent_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export const DEFAULT_CATEGORIES = [
  { slug: "movies", name: "Movies", emoji: "🎬", has_location: 0 },
  { slug: "tv", name: "TV", emoji: "📺", has_location: 0 },
  { slug: "music", name: "Music", emoji: "🎧", has_location: 0 },
  { slug: "restaurants", name: "Restaurants", emoji: "🍽️", has_location: 1 },
  { slug: "recipes", name: "Recipes", emoji: "🥘", has_location: 0 },
  { slug: "tips", name: "Tips & Tricks", emoji: "💡", has_location: 0 },
  { slug: "stores", name: "Stores", emoji: "🛍️", has_location: 1 },
  { slug: "fashion", name: "Fashion", emoji: "🧥", has_location: 0 },
  { slug: "travel", name: "Travel & Trips", emoji: "🧭", has_location: 1 },
  { slug: "other", name: "Other", emoji: "✨", has_location: 0 },
];

export const DEFAULT_SETTINGS = {
  group_name: "Worth a Mention",
  tagline: "Good things. Worth remembering.",
  digest_enabled: "1",
  digest_time: "08:00",
};

/** Creates tables, default categories and settings. On the very first boot it also loads the sample content. */
export async function initDatabase(client) {
  await client.execute("PRAGMA foreign_keys = ON");
  await client.executeMultiple(SCHEMA);
  const { rows } = await client.execute("SELECT COUNT(*) AS n FROM categories");
  if (Number(rows[0].n) === 0) {
    let i = 0;
    for (const c of DEFAULT_CATEGORIES) {
      await client.execute({
        sql: "INSERT INTO categories (id, slug, name, emoji, sort, has_location) VALUES (?, ?, ?, ?, ?, ?)",
        args: [crypto.randomBytes(9).toString("base64url"), c.slug, c.name, c.emoji, i++, c.has_location],
      });
    }
  }
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
    await client.execute({ sql: "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", args: [k, v] });
  }
  const seeded = await client.execute("SELECT value FROM settings WHERE key = 'samples_loaded'");
  if (!seeded.rows.length && process.env.SKIP_SAMPLE_DATA !== "1") {
    const { loadSampleData } = await import("./sample-data.mjs");
    await loadSampleData(client);
    await client.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('samples_loaded', '1')");
  }
}
