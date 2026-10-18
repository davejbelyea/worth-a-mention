<?php
/** Thin PDO wrapper that speaks both MySQL (production) and SQLite (local testing). */

function db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    $c = $GLOBALS['CONFIG'];
    if (($c['db_driver'] ?? 'mysql') === 'sqlite') {
        $pdo = new PDO('sqlite:' . $c['db_path']);
        $pdo->exec('PRAGMA foreign_keys = ON');
        $pdo->exec('PRAGMA journal_mode = WAL');
    } else {
        $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $c['db_host'], $c['db_port'] ?? 3306, $c['db_name']);
        $pdo = new PDO($dsn, $c['db_user'], $c['db_pass'], [PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4, time_zone = '+00:00'"]);
    }
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    return $pdo;
}

function is_mysql(): bool { return db()->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql'; }

function q(string $sql, array $args = []): PDOStatement {
    $st = db()->prepare($sql);
    foreach (array_values($args) as $i => $v) {
        $st->bindValue($i + 1, $v, is_int($v) ? PDO::PARAM_INT : ($v === null ? PDO::PARAM_NULL : PDO::PARAM_STR));
    }
    $st->execute();
    return $st;
}
function all(string $sql, array $args = []): array { return q($sql, $args)->fetchAll(); }
function one(string $sql, array $args = []): ?array { $r = q($sql, $args)->fetch(); return $r ?: null; }
function val(string $sql, array $args = []) { $r = q($sql, $args)->fetchColumn(); return $r === false ? null : $r; }

function insert(string $table, array $row, bool $ignore = false): void {
    $cols = array_keys($row);
    $verb = $ignore ? (is_mysql() ? 'INSERT IGNORE' : 'INSERT OR IGNORE') : 'INSERT';
    q("$verb INTO $table (" . implode(',', $cols) . ') VALUES (' . implode(',', array_fill(0, count($cols), '?')) . ')', array_values($row));
}

/** Insert or update on a unique key. */
function upsert(string $table, array $row, array $keys): void {
    $cols = array_keys($row);
    $upd = array_diff($cols, $keys);
    $sql = "INSERT INTO $table (" . implode(',', $cols) . ') VALUES (' . implode(',', array_fill(0, count($cols), '?')) . ')';
    if (is_mysql()) {
        $sql .= ' ON DUPLICATE KEY UPDATE ' . implode(',', array_map(fn($c) => "$c = VALUES($c)", $upd));
    } else {
        $sql .= ' ON CONFLICT(' . implode(',', $keys) . ') DO UPDATE SET ' . implode(',', array_map(fn($c) => "$c = excluded.$c", $upd));
    }
    q($sql, array_values($row));
}

function in_list(array $vals): string { return implode(',', array_fill(0, max(1, count($vals)), '?')); }

function new_id(): string { return rtrim(strtr(base64_encode(random_bytes(9)), '+/', '-_'), '='); }
function now(): string { return gmdate('Y-m-d\TH:i:s.v\Z'); }
function iso_ago(float $days): string { return gmdate('Y-m-d\TH:i:s.000\Z', (int) (time() - $days * 86400)); }

function setting(string $name, string $default = ''): string {
    static $cache = null;
    if ($cache === null) $cache = array_column(all('SELECT name, val FROM settings'), 'val', 'name');
    return $cache[$name] ?? (DEFAULT_SETTINGS[$name] ?? $default);
}
function set_setting(string $name, string $value): void {
    upsert('settings', ['name' => $name, 'val' => $value], ['name']);
}

const DEFAULT_SETTINGS = ['digest_enabled' => '1', 'digest_time' => '08:00', 'open_signup' => '1'];

const DEFAULT_CATEGORIES = [
    ['movies', 'Movies', '🎬', 0], ['tv', 'TV', '📺', 0], ['music', 'Music', '🎧', 0],
    ['restaurants', 'Restaurants', '🍽️', 1], ['recipes', 'Recipes', '🥘', 0], ['tips', 'Tips & Tricks', '💡', 0],
    ['stores', 'Stores', '🛍️', 1], ['fashion', 'Fashion', '🧥', 0], ['travel', 'Travel & Trips', '🧭', 1], ['other', 'Other', '✨', 0],
];

/** Creates all tables. Safe to run more than once. */
function migrate(): void {
    $mysql = is_mysql();
    $opts = $mysql ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci' : '';
    $id = 'VARCHAR(32)';
    $ts = 'VARCHAR(32)';
    $tables = [
        "users (id $id PRIMARY KEY, email VARCHAR(190) NOT NULL UNIQUE, name VARCHAR(120) NOT NULL, image VARCHAR(500), role VARCHAR(16) NOT NULL DEFAULT 'member', status VARCHAR(16) NOT NULL DEFAULT 'active', email_digest INT NOT NULL DEFAULT 1, is_sample INT NOT NULL DEFAULT 0, created_at $ts NOT NULL, last_seen_at $ts)",
        "invites (id $id PRIMARY KEY, email VARCHAR(190) NOT NULL, name VARCHAR(120), token VARCHAR(64) NOT NULL UNIQUE, invited_by $id, created_at $ts NOT NULL, expires_at $ts NOT NULL, accepted_at $ts, revoked_at $ts, FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL)",
        "login_tokens (token_hash VARCHAR(64) PRIMARY KEY, email VARCHAR(190) NOT NULL, next_path VARCHAR(300), invite_token VARCHAR(64), created_at $ts NOT NULL, expires_at $ts NOT NULL, used_at $ts)",
        "sessions (id_hash VARCHAR(64) PRIMARY KEY, user_id $id NOT NULL, created_at $ts NOT NULL, expires_at $ts NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)",
        "categories (id $id PRIMARY KEY, slug VARCHAR(60) NOT NULL UNIQUE, name VARCHAR(60) NOT NULL, emoji VARCHAR(16) NOT NULL, sort INT NOT NULL DEFAULT 0, has_location INT NOT NULL DEFAULT 0, archived INT NOT NULL DEFAULT 0)",
        "recs (id $id PRIMARY KEY, title VARCHAR(200) NOT NULL, title_key VARCHAR(200) NOT NULL, category_id $id, url VARCHAR(1000), url_key VARCHAR(500), image_url VARCHAR(1500), site_name VARCHAR(120), description TEXT, why TEXT, place_name VARCHAR(160), address VARCHAR(240), city VARCHAR(80), state VARCHAR(8), country VARCHAR(60), created_by $id, is_sample INT NOT NULL DEFAULT 0, created_at $ts NOT NULL, updated_at $ts NOT NULL, FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL, FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL)",
        "rec_photos (id $id PRIMARY KEY, rec_id $id NOT NULL, file VARCHAR(80) NOT NULL, added_by $id, sort INT NOT NULL DEFAULT 0, created_at $ts NOT NULL, FOREIGN KEY (rec_id) REFERENCES recs(id) ON DELETE CASCADE)",
        "rec_links (id $id PRIMARY KEY, rec_id $id NOT NULL, url VARCHAR(1000) NOT NULL, FOREIGN KEY (rec_id) REFERENCES recs(id) ON DELETE CASCADE)",
        "rec_tags (rec_id $id NOT NULL, tag VARCHAR(40) NOT NULL, PRIMARY KEY (rec_id, tag), FOREIGN KEY (rec_id) REFERENCES recs(id) ON DELETE CASCADE)",
        "ratings (rec_id $id NOT NULL, user_id $id NOT NULL, stars INT NOT NULL, updated_at $ts NOT NULL, PRIMARY KEY (rec_id, user_id), FOREIGN KEY (rec_id) REFERENCES recs(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)",
        "comments (id $id PRIMARY KEY, rec_id $id NOT NULL, user_id $id, body TEXT NOT NULL, is_sample INT NOT NULL DEFAULT 0, created_at $ts NOT NULL, edited_at $ts, FOREIGN KEY (rec_id) REFERENCES recs(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL)",
        "interests (rec_id $id NOT NULL, user_id $id NOT NULL, created_at $ts NOT NULL, PRIMARY KEY (rec_id, user_id), FOREIGN KEY (rec_id) REFERENCES recs(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)",
        "plans (id $id PRIMARY KEY, title VARCHAR(120) NOT NULL, description TEXT, emoji VARCHAR(16) NOT NULL, target_date VARCHAR(10), status VARCHAR(16) NOT NULL DEFAULT 'open', decided_item_id $id, created_by $id, is_sample INT NOT NULL DEFAULT 0, created_at $ts NOT NULL, updated_at $ts NOT NULL, FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL)",
        "plan_items (id $id PRIMARY KEY, plan_id $id NOT NULL, rec_id $id NOT NULL, added_by $id, created_at $ts NOT NULL, UNIQUE (plan_id, rec_id), FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE, FOREIGN KEY (rec_id) REFERENCES recs(id) ON DELETE CASCADE)",
        "plan_votes (item_id $id NOT NULL, user_id $id NOT NULL, created_at $ts NOT NULL, PRIMARY KEY (item_id, user_id), FOREIGN KEY (item_id) REFERENCES plan_items(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)",
        "plan_comments (id $id PRIMARY KEY, plan_id $id NOT NULL, user_id $id, body TEXT NOT NULL, is_sample INT NOT NULL DEFAULT 0, created_at $ts NOT NULL, FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL)",
        "newsletters (id $id PRIMARY KEY, edition INT NOT NULL, issue_date VARCHAR(10) NOT NULL UNIQUE, subject VARCHAR(300) NOT NULL, data MEDIUMTEXT NOT NULL, period_start $ts NOT NULL, period_end $ts NOT NULL, is_sample INT NOT NULL DEFAULT 0, created_at $ts NOT NULL, sent_at $ts, sent_count INT NOT NULL DEFAULT 0)",
        "settings (name VARCHAR(60) PRIMARY KEY, val TEXT NOT NULL)",
    ];
    foreach ($tables as $t) db()->exec('CREATE TABLE IF NOT EXISTS ' . $t . $opts);
    $idx = ['recs_created ON recs(created_at)', 'recs_title_key ON recs(title_key)', 'recs_url_key ON recs(url_key)', 'comments_rec ON comments(rec_id, created_at)', 'rec_tags_tag ON rec_tags(tag)'];
    foreach ($idx as $i) {
        try { db()->exec('CREATE INDEX ' . ($mysql ? '' : 'IF NOT EXISTS ') . $i); } catch (PDOException $e) { /* already there */ }
    }
    if ((int) val('SELECT COUNT(*) FROM categories') === 0) {
        foreach (DEFAULT_CATEGORIES as $i => [$slug, $name, $emoji, $loc]) {
            insert('categories', ['id' => new_id(), 'slug' => $slug, 'name' => $name, 'emoji' => $emoji, 'sort' => $i, 'has_location' => $loc]);
        }
    }
}
