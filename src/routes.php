<?php
// Every page and action in the app. Pages render views/*.php; actions redirect back.

function dispatch(string $method, string $path): void {
    $path = rtrim($path, '/') ?: '/';

    // Uploaded photos are private too: members only.
    if ($method === 'GET' && preg_match('#^/uploads/([\w-]+\.\w+)$#', $path, $m)) { serve_upload($m[1]); return; }

    if (!installed()) {
        require ROOT . '/src/install.php';
        install_page($method);
        return;
    }
    if ($method === 'POST') {
        // A file bigger than the server allows wipes out the whole form, so explain that instead of a confusing error.
        if (!$_POST && !$_FILES && (int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
            http_response_code(413);
            view('message', ['title' => 'Too big', 'emoji' => '📸', 'heading' => 'That photo was too big to upload', 'body' => 'Try a smaller photo, or a screenshot of it. Go back and give it another go.']);
            return;
        }
        check_csrf();
    }
    run_scheduler_if_due();

    $routes = [
        ['GET', '/', 'page_home'],
        ['GET', '/login', 'page_login'], ['POST', '/login', 'action_login'],
        ['GET', '/join/([\w-]+)', 'page_join'],
        ['GET', '/auth/google', 'auth_google'], ['GET', '/auth/google/callback', 'auth_google_callback'],
        ['GET', '/auth/verify', 'page_verify'], ['POST', '/auth/verify', 'action_verify'],
        ['POST', '/auth/signout', 'action_signout'],
        ['GET', '/browse', 'page_browse'],
        ['GET', '/add', 'page_add'], ['POST', '/add', 'action_save_rec'],
        ['GET', '/r/([\w-]+)', 'page_rec'], ['GET', '/r/([\w-]+)/edit', 'page_edit_rec'], ['POST', '/r/([\w-]+)/edit', 'action_save_rec'],
        ['POST', '/r/([\w-]+)/delete', 'action_delete_rec'], ['POST', '/r/([\w-]+)/rate', 'action_rate'], ['POST', '/r/([\w-]+)/interest', 'action_interest'],
        ['POST', '/r/([\w-]+)/comment', 'action_comment'], ['POST', '/r/([\w-]+)/photos', 'action_add_photos'], ['POST', '/photos/([\w-]+)/delete', 'action_delete_photo'], ['POST', '/comments/([\w-]+)/delete', 'action_delete_comment'], ['POST', '/comments/([\w-]+)/edit', 'action_edit_comment'],
        ['GET', '/plans', 'page_plans'], ['GET', '/plans/new', 'page_new_plan'], ['POST', '/plans/save', 'action_save_plan'],
        ['GET', '/plans/([\w-]+)', 'page_plan'], ['GET', '/plans/([\w-]+)/edit', 'page_edit_plan'], ['POST', '/plans/([\w-]+)/delete', 'action_delete_plan'],
        ['POST', '/plans/([\w-]+)/add', 'action_add_to_plan'], ['POST', '/plans/([\w-]+)/decide', 'action_decide'], ['POST', '/plans/([\w-]+)/comment', 'action_plan_comment'],
        ['POST', '/items/([\w-]+)/vote', 'action_vote'], ['POST', '/items/([\w-]+)/remove', 'action_remove_item'], ['POST', '/plan-comments/([\w-]+)/delete', 'action_delete_plan_comment'],
        ['GET', '/newsletter', 'page_newsletters'], ['GET', '/newsletter/([\w-]+)', 'page_newsletter'],
        ['GET', '/me', 'page_me'], ['POST', '/me', 'action_me'],
        ['GET', '/admin', 'page_admin'], ['GET', '/admin/preview', 'page_admin_preview'], ['POST', '/admin/([\w-]+)', 'action_admin'],
        ['POST', '/api/unfurl', 'api_unfurl'], ['GET', '/api/similar', 'api_similar'], ['GET', '/api/plan-search/([\w-]+)', 'api_plan_search'],
        ['GET', '/cron', 'web_cron'],
    ];
    foreach ($routes as [$m, $pattern, $fn]) {
        if ($m === $method && preg_match('#^' . $pattern . '$#', $path, $mm)) {
            $fn(...array_slice($mm, 1));
            return;
        }
    }
    not_found();
}

function back(string $fallback = '/'): never {
    $ref = $_SERVER['HTTP_REFERER'] ?? '';
    redirect($ref && str_starts_with($ref, app_url()) ? substr($ref, strlen(app_url())) ?: '/' : $fallback);
}

function serve_upload(string $file): void {
    if (!installed() || !current_user() || !is_file($path = STORAGE . '/uploads/' . $file)) { http_response_code(404); return; }
    $ext = pathinfo($file, PATHINFO_EXTENSION);
    header('Content-Type: ' . (array_flip(UPLOAD_TYPES)[$ext] ?? 'application/octet-stream'));
    header('Cache-Control: private, max-age=31536000, immutable');
    readfile($path);
}

/** Backup for the Thursday newsletter in case the server cron isn't set: checks at most every 10 minutes. */
function run_scheduler_if_due(): void {
    if (time() - (int) setting('scheduler_checked', '0') < 600) return;
    set_setting('scheduler_checked', (string) time());
    register_shutdown_function(function () {
        if (function_exists('fastcgi_finish_request')) fastcgi_finish_request();
        try { maybe_run_scheduled_digest(); } catch (Throwable $e) { error_log('[digest] ' . $e->getMessage()); }
    });
}

function web_cron(): void {
    if (!hash_equals((string) config('cron_key', ''), get('key'))) json_out(['error' => 'unauthorized'], 401);
    json_out(maybe_run_scheduled_digest());
}

// ================= Sign in =================

function page_login(): void {
    if (current_user()) redirect(safe_next(get('next')) ?: '/');
    view('login', ['title' => 'Sign in', 'next' => safe_next(get('next')) ?? '', 'error' => get('error')], 'layout_auth');
}

function action_login(): void {
    [$ok, $reason, $dev] = send_magic_link(post('email'), post('next') ?: null, post('invite') ?: null);
    $invite = post('invite');
    $vars = ['title' => 'Sign in', 'next' => post('next'), 'email' => post('email'), 'error' => $ok ? '' : $reason, 'sent' => $ok, 'devLink' => $dev];
    if ($invite && ($inv = find_open_invite($invite))) view('join', $vars + ['invite' => $inv], 'layout_auth');
    else view('login', $vars, 'layout_auth');
}

function page_join(string $token): void {
    view('join', ['title' => "You're invited", 'invite' => find_open_invite($token), 'token' => $token], 'layout_auth');
}

function page_verify(): void { view('verify', ['title' => 'Sign in', 'token' => get('token')], 'layout_auth'); }

function action_verify(): void {
    $row = consume_magic_link(post('token'));
    if (!$row) redirect('/login?error=expired');
    [$u, $err, $created] = complete_sign_in($row['email'], null, null, $row['invite_token']);
    if (!$u) redirect("/login?error=$err");
    create_session($u['id']);
    redirect($created ? '/?welcome=1' : ($row['next_path'] ?: '/'));
}

function action_signout(): void { sign_out(); redirect('/login'); }

function auth_google(): void {
    if (!google_enabled()) redirect('/login?error=google-off');
    $state = token(16);
    setcookie('wam_oauth', json_encode(['state' => $state, 'next' => safe_next(get('next')), 'invite' => get('invite') ?: null]), ['expires' => time() + 600, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax', 'secure' => is_https()]);
    redirect('https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query([
        'client_id' => setting('google_client_id'), 'redirect_uri' => app_url() . '/auth/google/callback', 'response_type' => 'code',
        'scope' => 'openid email profile', 'state' => $state, 'prompt' => 'select_account',
    ]), 302);
}

function auth_google_callback(): void {
    $saved = json_decode($_COOKIE['wam_oauth'] ?? '', true);
    setcookie('wam_oauth', '', ['expires' => 1, 'path' => '/']);
    if (!$saved || !get('code') || get('state') !== $saved['state']) redirect('/login?error=google');
    $ch = curl_init('https://oauth2.googleapis.com/token');
    curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15, CURLOPT_POSTFIELDS => http_build_query([
        'code' => get('code'), 'client_id' => setting('google_client_id'), 'client_secret' => setting('google_client_secret'),
        'redirect_uri' => app_url() . '/auth/google/callback', 'grant_type' => 'authorization_code',
    ])]);
    $tok = json_decode((string) curl_exec($ch), true);
    curl_close($ch);
    if (empty($tok['access_token'])) redirect('/login?error=google');
    $ch = curl_init('https://openidconnect.googleapis.com/v1/userinfo');
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15, CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $tok['access_token']]]);
    $info = json_decode((string) curl_exec($ch), true);
    curl_close($ch);
    if (empty($info['email']) || empty($info['email_verified'])) redirect('/login?error=google');
    [$u, $err, $created] = complete_sign_in($info['email'], $info['name'] ?? null, $info['picture'] ?? null, $saved['invite'] ?? null);
    if (!$u) redirect("/login?error=$err");
    create_session($u['id']);
    redirect($created ? '/?welcome=1' : ($saved['next'] ?: '/'));
}

// ================= Recommendations =================

function page_home(): void {
    $me = require_user();
    view('home', [
        'me' => $me, 'nav' => 'home', 'welcome' => get('welcome') !== '', 'cats' => categories(),
        'fresh' => list_recs(['limit' => 9]),
        'wanted' => array_filter(list_recs(['sort' => 'wanted', 'limit' => 4]), fn($r) => $r['interest_count'] > 0),
        'talk' => all('SELECT c.id, c.body, c.created_at, u.name, u.image, r.id AS rec_id, r.title FROM comments c JOIN users u ON u.id = c.user_id JOIN recs r ON r.id = c.rec_id ORDER BY c.created_at DESC LIMIT 5'),
        'plans' => all("SELECT p.id, p.title, p.emoji, p.target_date, p.is_sample, (SELECT COUNT(*) FROM plan_items WHERE plan_id = p.id) AS options FROM plans p WHERE p.status = 'open' ORDER BY p.target_date IS NULL, p.target_date, p.updated_at DESC LIMIT 3"),
        'latest' => one('SELECT id, subject, issue_date FROM newsletters ORDER BY issue_date DESC LIMIT 1'),
        'total' => (int) val('SELECT COUNT(*) FROM recs'),
    ]);
}

function page_browse(): void {
    $me = require_user();
    $sp = array_filter(['q' => get('q'), 'category' => get('category'), 'by' => get('by'), 'rating' => get('rating'), 'where' => get('where'), 'tag' => get('tag'), 'sort' => get('sort')], fn($v) => $v !== '');
    $sp['sort'] ??= 'new';
    view('browse', ['me' => $me, 'nav' => 'browse', 'title' => get('q') ? 'Search' : 'Browse', 'sp' => $sp, 'cats' => categories(), 'people' => contributors(), 'tags' => popular_tags(), 'recs' => list_recs($sp + ['limit' => 120])]);
}

function page_add(): void {
    $me = require_user();
    view('rec_form', ['me' => $me, 'nav' => 'add', 'title' => 'Add a recommendation', 'cats' => categories(), 'rec' => ['title' => get('title'), 'url' => get('url'), 'cat_slug' => get('category'), 'tags' => [], 'links' => [], 'photos' => []]]);
}

function page_edit_rec(string $id): void {
    $me = require_user();
    $rec = get_rec($id) ?? not_found();
    if (!can_edit_rec($me, $id)) redirect("/r/$id");
    view('rec_form', ['me' => $me, 'title' => 'Edit', 'cats' => categories(true), 'rec' => $rec]);
}

function action_save_rec(?string $id = null): void {
    $me = require_user();
    $cats = categories(true);
    $redo = function (string $error, ?array $dupe = null) use ($me, $cats, $id) {
        $rec = ['id' => $id, 'title' => post('title'), 'url' => post('url'), 'cat_slug' => post('category'), 'why' => post('why'), 'description' => post('description'), 'image_url' => post('image_url'), 'site_name' => post('site_name'),
            'place_name' => post('place_name'), 'address' => post('address'), 'city' => post('city'), 'state' => post('state'), 'country' => post('country'), 'tags' => parse_tags(post('tags')), 'links' => array_filter((array) ($_POST['link'] ?? [])), 'photos' => $id ? all('SELECT * FROM rec_photos WHERE rec_id = ?', [$id]) : []];
        view('rec_form', ['me' => $me, 'nav' => 'add', 'title' => 'Add a recommendation', 'cats' => $cats, 'rec' => $rec, 'error' => $error, 'dupe' => $dupe]);
        exit;
    };
    $title = post_str('title', 200);
    if (!$title) $redo("Give it a name. That's the only thing we really need.");
    if ($id && !can_edit_rec($me, $id)) $redo('Only the person who added this (or the founder) can edit it.');
    $url = clean_url(post('url'));
    if (!$id && post('force') !== '1') {
        foreach (find_similar($title, $url) as $d) if ($d['exact']) $redo('', $d);
    }
    $catId = val('SELECT id FROM categories WHERE slug = ?', [post('category') ?: 'other']);
    $state = post('state') ?: null;
    $country = post_str('country', 60);
    if ($state === 'INTL' || ($state && !isset(NEW_ENGLAND[$state]) && !isset(OTHER_STATES[$state]))) $state = null;
    if ($state) $country = 'US';
    $fields = [
        'title' => $title, 'title_key' => title_key($title), 'category_id' => $catId, 'url' => $url, 'url_key' => url_key($url),
        'image_url' => clean_url(post('image_url')), 'site_name' => post_str('site_name', 120), 'description' => post_str('description', 1200), 'why' => post_str('why', 3000),
        'place_name' => post_str('place_name', 160), 'address' => post_str('address', 240), 'city' => post_str('city', 80), 'state' => $state, 'country' => $country,
    ];
    $recId = $id ?: new_id();
    if ($id) {
        q('UPDATE recs SET ' . implode(', ', array_map(fn($k) => "$k = ?", array_keys($fields))) . ', updated_at = ? WHERE id = ?', [...array_values($fields), now(), $id]);
    } else {
        insert('recs', ['id' => $recId] + $fields + ['created_by' => $me['id'], 'created_at' => now(), 'updated_at' => now()]);
    }
    q('DELETE FROM rec_tags WHERE rec_id = ?', [$recId]);
    foreach (parse_tags(post('tags')) as $t) insert('rec_tags', ['rec_id' => $recId, 'tag' => $t], true);
    q('DELETE FROM rec_links WHERE rec_id = ?', [$recId]);
    foreach ((array) ($_POST['link'] ?? []) as $l) {
        if (($l = clean_url($l)) && $l !== $url) insert('rec_links', ['id' => new_id(), 'rec_id' => $recId, 'url' => $l]);
    }
    foreach ((array) ($_POST['remove_photo'] ?? []) as $pid) {
        if ($p = one('SELECT file FROM rec_photos WHERE id = ? AND rec_id = ?', [$pid, $recId])) {
            q('DELETE FROM rec_photos WHERE id = ?', [$pid]);
            delete_upload($p['file']);
        }
    }
    $sort = (int) val('SELECT COUNT(*) FROM rec_photos WHERE rec_id = ?', [$recId]);
    foreach (array_slice(files_list('photos'), 0, 8) as $f) {
        if ($name = save_upload($f)) insert('rec_photos', ['id' => new_id(), 'rec_id' => $recId, 'file' => $name, 'added_by' => $me['id'], 'sort' => $sort++, 'created_at' => now()]);
    }
    $stars = (int) post('stars');
    if (!$id && $stars >= 1 && $stars <= 5) upsert('ratings', ['rec_id' => $recId, 'user_id' => $me['id'], 'stars' => $stars, 'updated_at' => now()], ['rec_id', 'user_id']);
    redirect("/r/$recId" . ($id ? '' : '?added=1'));
}

function action_delete_rec(string $id): void {
    $me = require_user();
    if (!can_edit_rec($me, $id)) redirect("/r/$id");
    $photos = all('SELECT file FROM rec_photos WHERE rec_id = ?', [$id]);
    q('DELETE FROM recs WHERE id = ?', [$id]);
    foreach ($photos as $p) delete_upload($p['file']);
    redirect('/');
}

function page_rec(string $id): void {
    $me = require_user();
    $rec = get_rec($id) ?? not_found();
    view('rec', ['me' => $me, 'title' => $rec['title'], 'rec' => $rec, 'added' => get('added') !== '', 'photoError' => (int) get('photo_error'), 'photosAdded' => (int) get('photos'),
        'openPlans' => all("SELECT id, title, emoji FROM plans WHERE status = 'open' ORDER BY updated_at DESC")]);
}

function action_add_photos(string $id): void {
    $me = require_user();
    if (!val('SELECT id FROM recs WHERE id = ?', [$id])) not_found();
    $sort = (int) val('SELECT COUNT(*) FROM rec_photos WHERE rec_id = ?', [$id]);
    $added = $failed = 0;
    foreach (array_slice(files_list('photos'), 0, 8) as $f) {
        if ($name = save_upload($f)) {
            insert('rec_photos', ['id' => new_id(), 'rec_id' => $id, 'file' => $name, 'added_by' => $me['id'], 'sort' => $sort++, 'created_at' => now()]);
            $added++;
        } elseif (($f['error'] ?? 4) !== UPLOAD_ERR_NO_FILE) {
            $failed++;
        }
    }
    q('UPDATE recs SET updated_at = ? WHERE id = ?', [now(), $id]);
    redirect("/r/$id?" . ($failed ? 'photo_error=' . $failed : 'photos=' . $added) . '#photos');
}

function action_delete_photo(string $pid): void {
    $me = require_user();
    $p = one('SELECT * FROM rec_photos WHERE id = ?', [$pid]) ?? not_found();
    if ($p['added_by'] === $me['id'] || can_edit_rec($me, $p['rec_id'])) {
        q('DELETE FROM rec_photos WHERE id = ?', [$pid]);
        delete_upload($p['file']);
    }
    redirect("/r/{$p['rec_id']}#photos");
}

function action_rate(string $id): void {
    $me = require_user();
    $stars = (int) post('stars');
    $current = (int) val('SELECT stars FROM ratings WHERE rec_id = ? AND user_id = ?', [$id, $me['id']]);
    if ($stars === 0 || $stars === $current) q('DELETE FROM ratings WHERE rec_id = ? AND user_id = ?', [$id, $me['id']]);
    elseif ($stars >= 1 && $stars <= 5) upsert('ratings', ['rec_id' => $id, 'user_id' => $me['id'], 'stars' => $stars, 'updated_at' => now()], ['rec_id', 'user_id']);
    redirect("/r/$id");
}

function action_interest(string $id): void {
    $me = require_user();
    if (!q('DELETE FROM interests WHERE rec_id = ? AND user_id = ?', [$id, $me['id']])->rowCount()) {
        insert('interests', ['rec_id' => $id, 'user_id' => $me['id'], 'created_at' => now()], true);
    }
    redirect("/r/$id");
}

function action_comment(string $id): void {
    $me = require_user();
    $body = mb_substr(post('body'), 0, 4000);
    if ($body !== '' && val('SELECT id FROM recs WHERE id = ?', [$id])) insert('comments', ['id' => new_id(), 'rec_id' => $id, 'user_id' => $me['id'], 'body' => $body, 'created_at' => now()]);
    redirect("/r/$id#comments");
}

function action_edit_comment(string $cid): void {
    $me = require_user();
    $c = one('SELECT user_id, rec_id FROM comments WHERE id = ?', [$cid]) ?? not_found();
    if ($c['user_id'] === $me['id'] && post('body') !== '') q('UPDATE comments SET body = ?, edited_at = ? WHERE id = ?', [mb_substr(post('body'), 0, 4000), now(), $cid]);
    redirect("/r/{$c['rec_id']}#comments");
}

function action_delete_comment(string $cid): void {
    $me = require_user();
    $c = one('SELECT user_id, rec_id FROM comments WHERE id = ?', [$cid]) ?? not_found();
    if ($c['user_id'] === $me['id'] || $me['role'] === 'admin') q('DELETE FROM comments WHERE id = ?', [$cid]);
    redirect("/r/{$c['rec_id']}#comments");
}

// ================= Plans =================

function can_manage_plan(array $me, array $plan): bool { return $me['role'] === 'admin' || $plan['created_by'] === $me['id']; }
function touch_plan(string $id): void { q('UPDATE plans SET updated_at = ? WHERE id = ?', [now(), $id]); }

function page_plans(): void {
    $me = require_user();
    $plans = all("SELECT p.*, u.name AS creator,
        (SELECT COUNT(*) FROM plan_items WHERE plan_id = p.id) AS options,
        (SELECT COUNT(*) FROM plan_comments WHERE plan_id = p.id) AS comments,
        (SELECT r.title FROM plan_items i JOIN recs r ON r.id = i.rec_id WHERE i.id = p.decided_item_id) AS decided
        FROM plans p LEFT JOIN users u ON u.id = p.created_by
        ORDER BY p.status = 'open' DESC, p.target_date IS NULL, p.target_date, p.updated_at DESC");
    $voters = all('SELECT DISTINCT i.plan_id, u.name, u.image FROM plan_votes v JOIN plan_items i ON i.id = v.item_id JOIN users u ON u.id = v.user_id');
    view('plans', ['me' => $me, 'nav' => 'plans', 'title' => 'Plans', 'plans' => $plans, 'voters' => $voters]);
}

function page_new_plan(): void {
    $me = require_user();
    view('plan_form', ['me' => $me, 'nav' => 'plans', 'title' => 'New plan', 'plan' => null, 'rec' => get('rec')]);
}

function page_edit_plan(string $id): void {
    $me = require_user();
    $plan = one('SELECT * FROM plans WHERE id = ?', [$id]) ?? not_found();
    if (!can_manage_plan($me, $plan)) redirect("/plans/$id");
    view('plan_form', ['me' => $me, 'nav' => 'plans', 'title' => 'Edit plan', 'plan' => $plan, 'rec' => '']);
}

function action_save_plan(): void {
    $me = require_user();
    $title = post_str('title', 120);
    if (!$title) back('/plans/new');
    $date = preg_match('/^\d{4}-\d{2}-\d{2}$/', post('target_date')) ? post('target_date') : null;
    $fields = ['title' => $title, 'description' => post_str('description', 2000), 'emoji' => mb_substr(post('emoji') ?: '🗓️', 0, 8), 'target_date' => $date];
    if ($id = post('id')) {
        $plan = one('SELECT * FROM plans WHERE id = ?', [$id]) ?? not_found();
        if (can_manage_plan($me, $plan)) q('UPDATE plans SET title = ?, description = ?, emoji = ?, target_date = ?, updated_at = ? WHERE id = ?', [...array_values($fields), now(), $id]);
        redirect("/plans/$id");
    }
    $pid = new_id();
    insert('plans', ['id' => $pid] + $fields + ['created_by' => $me['id'], 'created_at' => now(), 'updated_at' => now()]);
    if (($rec = post('rec')) && val('SELECT id FROM recs WHERE id = ?', [$rec])) insert('plan_items', ['id' => new_id(), 'plan_id' => $pid, 'rec_id' => $rec, 'added_by' => $me['id'], 'created_at' => now()], true);
    redirect("/plans/$pid");
}

function action_delete_plan(string $id): void {
    $me = require_user();
    $plan = one('SELECT * FROM plans WHERE id = ?', [$id]) ?? not_found();
    if (can_manage_plan($me, $plan)) q('DELETE FROM plans WHERE id = ?', [$id]);
    redirect('/plans');
}

function page_plan(string $id): void {
    $me = require_user();
    $plan = one('SELECT p.*, u.name AS creator, u.image AS creator_image FROM plans p LEFT JOIN users u ON u.id = p.created_by WHERE p.id = ?', [$id]) ?? not_found();
    $items = all("SELECT i.id, i.rec_id, i.added_by, u.name AS adder, r.title, r.city, r.state, r.country, r.image_url, c.emoji, c.name AS category,
        (SELECT p.file FROM rec_photos p WHERE p.rec_id = r.id ORDER BY p.sort LIMIT 1) AS photo,
        (SELECT AVG(stars) FROM ratings WHERE rec_id = r.id) AS avg, (SELECT COUNT(*) FROM ratings WHERE rec_id = r.id) AS ratings
        FROM plan_items i JOIN recs r ON r.id = i.rec_id LEFT JOIN categories c ON c.id = r.category_id LEFT JOIN users u ON u.id = i.added_by
        WHERE i.plan_id = ? ORDER BY i.created_at", [$id]);
    $votes = all('SELECT v.item_id, v.user_id, u.name, u.image FROM plan_votes v JOIN users u ON u.id = v.user_id JOIN plan_items i ON i.id = v.item_id WHERE i.plan_id = ? ORDER BY v.created_at', [$id]);
    foreach ($items as &$it) {
        $it['voters'] = array_values(array_filter($votes, fn($v) => $v['item_id'] === $it['id']));
        $it['cover'] = $it['image_url'] ?: ($it['photo'] ? '/uploads/' . $it['photo'] : null);
    }
    unset($it);
    usort($items, fn($a, $b) => count($b['voters']) <=> count($a['voters']));
    view('plan', ['me' => $me, 'nav' => 'plans', 'title' => $plan['title'], 'plan' => $plan, 'items' => $items,
        'comments' => all('SELECT c.*, u.name, u.image FROM plan_comments c LEFT JOIN users u ON u.id = c.user_id WHERE c.plan_id = ? ORDER BY c.created_at', [$id]),
        'voterCount' => count(array_unique(array_column($votes, 'user_id')))]);
}

function action_add_to_plan(string $planId): void {
    $me = require_user();
    $rec = post('rec');
    if (val('SELECT id FROM plans WHERE id = ?', [$planId]) && val('SELECT id FROM recs WHERE id = ?', [$rec])) {
        insert('plan_items', ['id' => new_id(), 'plan_id' => $planId, 'rec_id' => $rec, 'added_by' => $me['id'], 'created_at' => now()], true);
        touch_plan($planId);
    }
    if (post('from') === 'rec') redirect("/r/$rec");
    redirect("/plans/$planId");
}

function action_remove_item(string $itemId): void {
    $me = require_user();
    $it = one('SELECT i.plan_id, i.added_by, p.created_by FROM plan_items i JOIN plans p ON p.id = i.plan_id WHERE i.id = ?', [$itemId]) ?? not_found();
    if ($it['added_by'] === $me['id'] || $it['created_by'] === $me['id'] || $me['role'] === 'admin') {
        q('DELETE FROM plan_items WHERE id = ?', [$itemId]);
        q('UPDATE plans SET decided_item_id = NULL WHERE decided_item_id = ?', [$itemId]);
    }
    redirect("/plans/{$it['plan_id']}");
}

function action_vote(string $itemId): void {
    $me = require_user();
    $it = one('SELECT i.plan_id, p.status FROM plan_items i JOIN plans p ON p.id = i.plan_id WHERE i.id = ?', [$itemId]) ?? not_found();
    if ($it['status'] === 'open') {
        if (!q('DELETE FROM plan_votes WHERE item_id = ? AND user_id = ?', [$itemId, $me['id']])->rowCount()) {
            insert('plan_votes', ['item_id' => $itemId, 'user_id' => $me['id'], 'created_at' => now()], true);
        }
        touch_plan($it['plan_id']);
    }
    redirect("/plans/{$it['plan_id']}");
}

function action_decide(string $planId): void {
    require_user();
    if ($item = post('item')) q("UPDATE plans SET status = 'decided', decided_item_id = ?, updated_at = ? WHERE id = ?", [$item, now(), $planId]);
    else q("UPDATE plans SET status = 'open', decided_item_id = NULL, updated_at = ? WHERE id = ?", [now(), $planId]);
    redirect("/plans/$planId");
}

function action_plan_comment(string $planId): void {
    $me = require_user();
    $body = mb_substr(post('body'), 0, 4000);
    if ($body !== '' && val('SELECT id FROM plans WHERE id = ?', [$planId])) {
        insert('plan_comments', ['id' => new_id(), 'plan_id' => $planId, 'user_id' => $me['id'], 'body' => $body, 'created_at' => now()]);
        touch_plan($planId);
    }
    redirect("/plans/$planId#discussion");
}

function action_delete_plan_comment(string $id): void {
    $me = require_user();
    $c = one('SELECT user_id, plan_id FROM plan_comments WHERE id = ?', [$id]) ?? not_found();
    if ($c['user_id'] === $me['id'] || $me['role'] === 'admin') q('DELETE FROM plan_comments WHERE id = ?', [$id]);
    redirect("/plans/{$c['plan_id']}#discussion");
}

// ================= Newsletter =================

function page_newsletters(): void {
    $me = require_user();
    view('newsletters', ['me' => $me, 'nav' => 'newsletter', 'title' => 'The Thursday newsletter', 'issues' => all('SELECT id, edition, issue_date, subject, data, is_sample FROM newsletters ORDER BY issue_date DESC')]);
}

function page_newsletter(string $id): void {
    $me = require_user();
    $n = one('SELECT * FROM newsletters WHERE id = ?', [$id]) ?? not_found();
    view('newsletter', ['me' => $me, 'nav' => 'newsletter', 'title' => 'Newsletter, ' . format_day($n['issue_date'], 'F j'), 'n' => $n, 'data' => json_decode($n['data'], true),
        'prev' => val('SELECT id FROM newsletters WHERE issue_date < ? ORDER BY issue_date DESC LIMIT 1', [$n['issue_date']]),
        'next' => val('SELECT id FROM newsletters WHERE issue_date > ? ORDER BY issue_date LIMIT 1', [$n['issue_date']])]);
}

// ================= Profile =================

function page_me(): void {
    $me = require_user();
    view('me', ['me' => $me, 'title' => 'You', 'mine' => list_recs(['by' => $me['id'], 'limit' => 60]), 'saved' => get('saved') !== '']);
}

function action_me(): void {
    $me = require_user();
    if ($name = post_str('name', 60)) q('UPDATE users SET name = ? WHERE id = ?', [$name, $me['id']]);
    q('UPDATE users SET email_digest = ? WHERE id = ?', [isset($_POST['email_digest']) ? 1 : 0, $me['id']]);
    if (!empty($_FILES['photo']['size']) && ($file = save_upload($_FILES['photo']))) q('UPDATE users SET image = ? WHERE id = ?', ["/uploads/$file", $me['id']]);
    redirect('/me?saved=1');
}

// ================= Admin =================

function page_admin(): void {
    $me = require_admin();
    $tab = in_array(get('tab'), ['members', 'categories', 'newsletter', 'content', 'connections'], true) ? get('tab') : 'members';
    view('admin', ['me' => $me, 'title' => 'Group settings', 'tab' => $tab, 'msg' => get('msg')]);
}

function page_admin_preview(): void {
    $me = require_admin();
    view('admin_preview', ['me' => $me, 'title' => 'Newsletter preview', 'p' => preview_digest()]);
}

function action_admin(string $action): void {
    $me = require_admin();
    $back = fn(string $tab, string $msg = '') => redirect("/admin?tab=$tab" . ($msg ? '&msg=' . rawurlencode($msg) : ''));
    switch ($action) {
        case 'invite':
            $email = strtolower(post('email'));
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $back('members', "That email doesn't look right.");
            $existing = one('SELECT status FROM users WHERE email = ?', [$email]);
            if (($existing['status'] ?? '') === 'active') $back('members', "$email is already a member.");
            q('UPDATE invites SET revoked_at = ? WHERE email = ? AND accepted_at IS NULL AND revoked_at IS NULL', [now(), $email]);
            $inv = ['id' => new_id(), 'email' => $email, 'name' => post_str('name', 120), 'token' => token(24), 'invited_by' => $me['id'], 'created_at' => now(), 'expires_at' => gmdate('Y-m-d\TH:i:s.000\Z', time() + 14 * 86400)];
            insert('invites', $inv);
            if ($existing) q("UPDATE users SET status = 'active' WHERE email = ?", [$email]);
            $back('members', send_invite_email($inv, $me['name']) ? "Invite sent to $email." : "Invite created, but the email didn't send. Copy the link below and send it yourself.");
        case 'open-signup':
            set_setting('open_signup', post('on') === '1' ? '1' : '0');
            $back('members', post('on') === '1' ? 'Sign-up is open. Anyone with an email can join.' : "Back to invite only. People who already joined stay members.");
        case 'member-link':
            $m = one("SELECT * FROM users WHERE id = ? AND status = 'active'", [post('id')]);
            if (!$m) $back('members');
            view('admin', ['me' => $me, 'title' => 'Group settings', 'tab' => 'members', 'msg' => '', 'memberLink' => ['name' => $m['name'], 'url' => new_login_link($m['email'], null, null, 3 * 86400)]]);
            exit;
        case 'resend':
            if ($inv = one('SELECT * FROM invites WHERE id = ?', [post('id')])) {
                q('UPDATE invites SET expires_at = ? WHERE id = ?', [gmdate('Y-m-d\TH:i:s.000\Z', time() + 14 * 86400), $inv['id']]);
                send_invite_email($inv, $me['name']);
                $back('members', "Sent another invite to {$inv['email']}.");
            }
            $back('members');
        case 'revoke':
            q('UPDATE invites SET revoked_at = ? WHERE id = ?', [now(), post('id')]);
            $back('members', 'Invite cancelled.');
        case 'member-status':
            $id = post('id');
            if ($id === $me['id']) $back('members', "You can't remove yourself.");
            $status = post('status') === 'removed' ? 'removed' : 'active';
            q('UPDATE users SET status = ? WHERE id = ?', [$status, $id]);
            if ($status === 'removed') q('DELETE FROM sessions WHERE user_id = ?', [$id]);
            $back('members', $status === 'removed' ? 'Member removed. Their posts stay up with their name on them.' : 'Member restored.');
        case 'category':
            $name = post_str('name', 40);
            if (!$name) $back('categories');
            $emoji = mb_substr(post('emoji') ?: '✨', 0, 8);
            $loc = isset($_POST['has_location']) ? 1 : 0;
            if ($id = post('id')) {
                q('UPDATE categories SET name = ?, emoji = ?, has_location = ? WHERE id = ?', [$name, $emoji, $loc, $id]);
            } else {
                $slug = trim(preg_replace('/[^a-z0-9]+/', '-', str_replace('&', 'and', strtolower($name))), '-') ?: 'cat';
                if (val('SELECT id FROM categories WHERE slug = ?', [$slug])) $slug .= '-' . bin2hex(random_bytes(2));
                insert('categories', ['id' => new_id(), 'slug' => $slug, 'name' => $name, 'emoji' => $emoji, 'sort' => (int) val('SELECT COALESCE(MAX(sort), 0) FROM categories') + 1, 'has_location' => $loc]);
            }
            $back('categories', 'Categories updated.');
        case 'category-move':
            $ids = array_column(all('SELECT id FROM categories ORDER BY sort, name'), 'id');
            $i = array_search(post('id'), $ids, true);
            $j = $i === false ? -1 : $i + (post('dir') === 'up' ? -1 : 1);
            if ($j >= 0 && $j < count($ids)) {
                [$ids[$i], $ids[$j]] = [$ids[$j], $ids[$i]];
                foreach ($ids as $k => $cid) q('UPDATE categories SET sort = ? WHERE id = ?', [$k, $cid]);
            }
            $back('categories');
        case 'category-archive':
            q('UPDATE categories SET archived = ? WHERE id = ?', [post('archived') === '1' ? 1 : 0, post('id')]);
            $back('categories', post('archived') === '1' ? 'Category hidden. Existing recommendations keep it.' : 'Category is back.');
        case 'digest-settings':
            if (preg_match('/^\d{2}:\d{2}$/', post('digest_time'))) set_setting('digest_time', post('digest_time'));
            set_setting('digest_enabled', isset($_POST['digest_enabled']) ? '1' : '0');
            $back('newsletter', 'Newsletter settings saved.');
        case 'digest-send':
            $today = ny_parts()['date'];
            if (val('SELECT id FROM newsletters WHERE issue_date = ?', [$today])) $back('newsletter', "Today's edition already went out. Only one per day.");
            [, , $sent] = publish_digest($today);
            $back('newsletter', 'Published and emailed to ' . plural($sent, 'member') . '.');
        case 'digest-test':
            $back('newsletter', send_test_digest($me) ? "Preview sent to {$me['email']}." : "The preview email didn't send. Check the email settings under Connections.");
        case 'samples-remove':
            $back('content', 'Sample content removed (' . remove_sample_data() . " items). It's all yours now.");
        case 'samples-load':
            load_sample_data();
            $back('content', 'Sample content loaded.');
        case 'connections':
            foreach (['google_client_id', 'google_client_secret', 'resend_api_key', 'email_from'] as $k) {
                $v = post($k);
                if ($v === '••••••••') continue; // unchanged secret
                set_setting($k, $v);
            }
            $back('connections', 'Saved. Changes apply right away.');
        case 'email-test':
            $ok = send_email($me['email'], 'Test email from Worth a Mention', simple_email('It works!', 'Email is set up correctly. Invites, sign-in links and the Thursday newsletter will now arrive by email.', 'Open the site', app_url()), 'Email is set up correctly.');
            $back('connections', $ok ? "Test email sent to {$me['email']}." : "That didn't send. Double-check the Resend key and the From address.");
    }
    not_found();
}

// ================= Little JSON helpers for the add form =================

function api_unfurl(): void {
    require_user();
    $d = unfurl(post('url'));
    $d ? json_out($d) : json_out(['error' => "That doesn't look like a link."], 400);
}

function api_similar(): void {
    require_user();
    json_out(array_map(fn($r) => ['id' => $r['id'], 'title' => $r['title'], 'author' => $r['author_name'], 'emoji' => $r['cat_emoji'], 'exact' => $r['exact']], find_similar(get('title'), get('url') ?: null)));
}

function api_plan_search(string $planId): void {
    require_user();
    $existing = array_column(all('SELECT rec_id FROM plan_items WHERE plan_id = ?', [$planId]), 'rec_id');
    partial('plan_search_results', ['planId' => $planId, 'hits' => list_recs(['q' => get('q'), 'limit' => 12, 'sort' => get('q') ? 'top' : 'new']), 'existing' => $existing]);
}
