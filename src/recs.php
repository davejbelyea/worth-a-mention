<?php

function categories(bool $includeArchived = false): array {
    return all('SELECT * FROM categories ' . ($includeArchived ? '' : 'WHERE archived = 0 ') . 'ORDER BY sort, name');
}

const CARD_SELECT = "SELECT r.id, r.title, r.why, r.description, r.url, r.image_url, r.site_name, r.place_name, r.address, r.city, r.state, r.country,
    r.created_at, r.updated_at, r.is_sample, r.created_by, r.category_id,
    (SELECT p.file FROM rec_photos p WHERE p.rec_id = r.id ORDER BY p.sort, p.created_at LIMIT 1) AS photo,
    u.name AS author_name, u.image AS author_image,
    c.slug AS cat_slug, c.name AS cat_name, c.emoji AS cat_emoji, c.has_location AS cat_has_location,
    (SELECT AVG(stars) FROM ratings WHERE rec_id = r.id) AS avg_rating,
    (SELECT COUNT(*) FROM ratings WHERE rec_id = r.id) AS rating_count,
    (SELECT COUNT(*) FROM comments WHERE rec_id = r.id) AS comment_count,
    (SELECT COUNT(*) FROM interests WHERE rec_id = r.id) AS interest_count
  FROM recs r
  LEFT JOIN users u ON u.id = r.created_by
  LEFT JOIN categories c ON c.id = r.category_id";

function shape_rec(array $r): array {
    $r['avg_rating'] = $r['avg_rating'] !== null ? (float) $r['avg_rating'] : null;
    foreach (['rating_count', 'comment_count', 'interest_count', 'is_sample'] as $k) $r[$k] = (int) ($r[$k] ?? 0);
    $r['cover'] = $r['image_url'] ?: (!empty($r['photo']) ? '/uploads/' . $r['photo'] : null);
    return $r;
}

/** Filters: q, category, by, rating, where (ne | state | elsewhere), tag, sort, limit */
function list_recs(array $f = []): array {
    $where = [];
    $args = [];
    if (($f['q'] ?? '') !== '') {
        $like = '%' . str_replace(['%', '_'], '', $f['q']) . '%';
        $where[] = '(r.title LIKE ? OR r.why LIKE ? OR r.description LIKE ? OR r.place_name LIKE ? OR r.city LIKE ? OR r.site_name LIKE ?
            OR EXISTS (SELECT 1 FROM rec_tags t WHERE t.rec_id = r.id AND t.tag LIKE ?)
            OR EXISTS (SELECT 1 FROM comments cm WHERE cm.rec_id = r.id AND cm.body LIKE ?))';
        array_push($args, ...array_fill(0, 8, $like));
    }
    if (!empty($f['category'])) { $where[] = 'c.slug = ?'; $args[] = $f['category']; }
    if (!empty($f['by'])) { $where[] = 'r.created_by = ?'; $args[] = $f['by']; }
    if (!empty($f['tag'])) { $where[] = 'EXISTS (SELECT 1 FROM rec_tags t WHERE t.rec_id = r.id AND t.tag = ?)'; $args[] = mb_strtolower($f['tag']); }
    $ne = array_keys(NEW_ENGLAND);
    if (($f['where'] ?? '') === 'ne') { $where[] = 'r.state IN (' . in_list($ne) . ')'; array_push($args, ...$ne); }
    elseif (($f['where'] ?? '') === 'elsewhere') { $where[] = '(r.state IS NOT NULL OR r.country IS NOT NULL) AND (r.state IS NULL OR r.state NOT IN (' . in_list($ne) . '))'; array_push($args, ...$ne); }
    elseif (!empty($f['where'])) { $where[] = 'r.state = ?'; $args[] = $f['where']; }

    $order = match ($f['sort'] ?? 'new') {
        'top' => 'avg_rating IS NULL, avg_rating DESC, rating_count DESC',
        'talked' => 'comment_count DESC, created_at DESC',
        'wanted' => 'interest_count DESC, created_at DESC',
        'old' => 'created_at ASC',
        default => 'created_at DESC',
    };
    $min = (float) ($f['rating'] ?? 0);
    $limit = (int) ($f['limit'] ?? 60);
    $sql = 'SELECT * FROM (' . CARD_SELECT . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . ') t'
        . ($min > 0 ? " WHERE avg_rating >= $min" : '') . " ORDER BY $order LIMIT $limit";
    return array_map('shape_rec', all($sql, $args));
}

function get_rec(string $id): ?array {
    $r = one(CARD_SELECT . ' WHERE r.id = ?', [$id]);
    if (!$r) return null;
    $r = shape_rec($r);
    $r['photos'] = all('SELECT * FROM rec_photos WHERE rec_id = ? ORDER BY sort, created_at', [$id]);
    $r['links'] = all('SELECT * FROM rec_links WHERE rec_id = ?', [$id]);
    $r['tags'] = array_column(all('SELECT tag FROM rec_tags WHERE rec_id = ? ORDER BY tag', [$id]), 'tag');
    $r['ratings'] = all('SELECT ra.user_id, ra.stars, u.name, u.image FROM ratings ra JOIN users u ON u.id = ra.user_id WHERE ra.rec_id = ? ORDER BY ra.stars DESC, u.name', [$id]);
    $r['comments'] = all('SELECT c.*, u.name, u.image FROM comments c LEFT JOIN users u ON u.id = c.user_id WHERE c.rec_id = ? ORDER BY c.created_at', [$id]);
    $r['interested'] = all('SELECT i.user_id, u.name, u.image FROM interests i JOIN users u ON u.id = i.user_id WHERE i.rec_id = ? ORDER BY i.created_at', [$id]);
    $r['plans'] = all('SELECT p.id, p.title, p.emoji, p.status FROM plan_items pi JOIN plans p ON p.id = pi.plan_id WHERE pi.rec_id = ? ORDER BY p.created_at DESC', [$id]);
    return $r;
}

/** Recommendations that look like the same thing (same link or same-ish name). */
function find_similar(string $title, ?string $url = null, ?string $exclude = null): array {
    $tk = title_key($title);
    $uk = url_key(clean_url($url));
    if (strlen($tk) < 3 && !$uk) return [];
    $conds = [];
    $args = [];
    if ($uk) { $conds[] = 'r.url_key = ?'; $args[] = $uk; }
    if (strlen($tk) >= 3) {
        $conds[] = 'r.title_key = ?'; $args[] = $tk;
        $conds[] = 'r.title_key LIKE ?'; $args[] = "$tk%";
        if (strlen($tk) >= 5) { $conds[] = 'r.title_key LIKE ?'; $args[] = "%$tk%"; }
    }
    $sql = str_replace('SELECT r.id,', 'SELECT r.title_key, r.url_key, r.id,', CARD_SELECT) . ' WHERE (' . implode(' OR ', $conds) . ')' . ($exclude ? ' AND r.id != ?' : '') . ' ORDER BY r.created_at LIMIT 5';
    if ($exclude) $args[] = $exclude;
    return array_map(function ($r) use ($tk, $uk) {
        $r = shape_rec($r);
        $r['exact'] = ($uk && $r['url_key'] === $uk) || $r['title_key'] === $tk;
        return $r;
    }, all($sql, $args));
}

function popular_tags(int $limit = 18): array {
    return all("SELECT tag, COUNT(*) AS n FROM rec_tags GROUP BY tag ORDER BY n DESC, tag LIMIT $limit");
}
function contributors(): array {
    return all('SELECT u.id, u.name FROM users u WHERE EXISTS (SELECT 1 FROM recs r WHERE r.created_by = u.id) ORDER BY u.name');
}

function can_edit_rec(array $user, string $recId): bool {
    $by = val('SELECT created_by FROM recs WHERE id = ?', [$recId]);
    return $user['role'] === 'admin' || ($by && $by === $user['id']);
}

// ---------- Uploads ----------
const UPLOAD_TYPES = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif', 'image/heic' => 'heic', 'image/heif' => 'heif', 'image/avif' => 'avif'];

/** Saves one entry from $_FILES and returns the stored filename, or null. */
function save_upload(array $f): ?string {
    if (($f['error'] ?? 1) !== UPLOAD_ERR_OK || !$f['size'] || $f['size'] > 20 * 1024 * 1024) {
        if (($f['error'] ?? 4) !== UPLOAD_ERR_NO_FILE) error_log('[upload] skipped ' . ($f['name'] ?? '?') . ' error=' . ($f['error'] ?? '?') . ' size=' . ($f['size'] ?? 0));
        return null;
    }
    $type = (new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);
    $ext = UPLOAD_TYPES[$type] ?? null;
    if (!$ext) return null;
    @mkdir(STORAGE . '/uploads', 0775, true);
    $name = token(12) . '.' . $ext;
    return move_uploaded_file($f['tmp_name'], STORAGE . '/uploads/' . $name) ? $name : null;
}
function delete_upload(string $name): void {
    if (preg_match('/^[\w-]+\.\w+$/', $name)) @unlink(STORAGE . '/uploads/' . $name);
}
/** Normalizes $_FILES['x'] with multiple files into a list. */
function files_list(string $key): array {
    $f = $_FILES[$key] ?? null;
    if (!$f || !is_array($f['name'])) return $f ? [$f] : [];
    $out = [];
    foreach ($f['name'] as $i => $_) $out[] = ['name' => $f['name'][$i], 'type' => $f['type'][$i], 'tmp_name' => $f['tmp_name'][$i], 'error' => $f['error'][$i], 'size' => $f['size'][$i]];
    return $out;
}
