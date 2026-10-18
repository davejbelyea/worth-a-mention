<?php
// Realistic sample content so the site doesn't feel empty on day one.
// Everything is flagged is_sample = 1 and shows a "Sample" tag.
// The founder can remove it all from Settings → Content.

function sample_ahead(int $days): string { return ny('@' . (time() + $days * 86400))->format('Y-m-d'); }

function load_sample_data(): void {
    if ((int) val('SELECT COUNT(*) FROM recs WHERE is_sample = 1') > 0) return;
    $S = json_decode(file_get_contents(__DIR__ . '/sample-data.json'), true);
    $cats = [];
    foreach (all('SELECT slug, id, name, emoji FROM categories') as $c) $cats[$c['slug']] = $c;

    $users = [];
    foreach ($S['PEOPLE'] as [$key, $name]) {
        $email = "$key@example.com";
        $users[$key] = val('SELECT id FROM users WHERE email = ?', [$email]) ?: new_id();
        insert('users', ['id' => $users[$key], 'email' => $email, 'name' => $name, 'role' => 'member', 'status' => 'active', 'is_sample' => 1, 'created_at' => iso_ago(130)], true);
    }
    $recIds = [];
    $recDays = [];
    foreach ($S['RECS'] as [$key, $title, $cat, $author, $days, $why, $place, $tags]) {
        $id = $recIds[$key] = new_id();
        $recDays[$key] = $days;
        $ts = iso_ago($days + (3 + strlen($title) % 9) / 24);
        $p = $place ?: [];
        insert('recs', ['id' => $id, 'title' => $title, 'title_key' => title_key($title), 'category_id' => $cats[$cat]['id'] ?? null, 'why' => $why,
            'place_name' => $p['place_name'] ?? null, 'address' => $p['address'] ?? null, 'city' => $p['city'] ?? null, 'state' => $p['state'] ?? null,
            'country' => $p['country'] ?? (!empty($p['state']) ? 'US' : null), 'created_by' => $users[$author], 'is_sample' => 1, 'created_at' => $ts, 'updated_at' => $ts]);
        foreach (parse_tags($tags) as $t) insert('rec_tags', ['rec_id' => $id, 'tag' => $t], true);
    }
    foreach ($S['COMMENTS'] as [$rec, $who, $days, $body]) {
        insert('comments', ['id' => new_id(), 'rec_id' => $recIds[$rec], 'user_id' => $users[$who], 'body' => $body, 'is_sample' => 1, 'created_at' => iso_ago($days)]);
    }
    foreach ($S['RATINGS'] as $rec => $map) {
        $k = 0;
        foreach ($map as $who => $stars) insert('ratings', ['rec_id' => $recIds[$rec], 'user_id' => $users[$who], 'stars' => $stars, 'updated_at' => iso_ago(max(0.2, $recDays[$rec] - 0.3 - $k++ * 0.4))], true);
    }
    foreach ($S['INTEREST'] as $rec => $people) {
        foreach ($people as $who) insert('interests', ['rec_id' => $recIds[$rec], 'user_id' => $users[$who], 'created_at' => iso_ago(max(0.1, $recDays[$rec] - 0.5))], true);
    }
    $planIds = [];
    foreach ($S['PLANS'] as $p) {
        $pid = $planIds[$p['key']] = new_id();
        insert('plans', ['id' => $pid, 'title' => $p['title'], 'description' => $p['description'], 'emoji' => $p['emoji'], 'target_date' => $p['date'] ? sample_ahead($p['date']) : null,
            'created_by' => $users[$p['by']], 'is_sample' => 1, 'created_at' => iso_ago($p['days']), 'updated_at' => iso_ago(1)]);
        foreach ($p['items'] as $rec => $voters) {
            $iid = new_id();
            insert('plan_items', ['id' => $iid, 'plan_id' => $pid, 'rec_id' => $recIds[$rec], 'added_by' => $users[$voters[0]] ?? $users[$p['by']], 'created_at' => iso_ago($p['days'] - 0.5)]);
            foreach ($voters as $v) insert('plan_votes', ['item_id' => $iid, 'user_id' => $users[$v], 'created_at' => iso_ago(max(0.5, $p['days'] - 1))], true);
        }
        foreach ($p['comments'] as [$who, $days, $body]) {
            insert('plan_comments', ['id' => new_id(), 'plan_id' => $pid, 'user_id' => $users[$who], 'body' => $body, 'is_sample' => 1, 'created_at' => iso_ago($days)]);
        }
    }
    // Two past newsletter editions, built from the sample activity, so the archive isn't empty.
    $thursdays = [];
    for ($i = 1; count($thursdays) < 2 && $i < 30; $i++) {
        $d = ny('@' . (time() - $i * 86400));
        if ($d->format('D') === 'Thu') $thursdays[] = $d->format('Y-m-d');
    }
    foreach (array_reverse($thursdays) as $n => $date) {
        if (val('SELECT id FROM newsletters WHERE issue_date = ?', [$date])) continue;
        $end = gmdate('Y-m-d\TH:i:s.000\Z', strtotime("$date 12:00:00 UTC"));
        $start = gmdate('Y-m-d\TH:i:s.000\Z', strtotime($end) - 7 * 86400);
        $data = build_digest($start, $end, $date);
        insert('newsletters', ['id' => new_id(), 'edition' => $n + 1, 'issue_date' => $date, 'subject' => digest_subject($data, $date), 'data' => json_encode($data, JSON_UNESCAPED_UNICODE),
            'period_start' => $start, 'period_end' => $end, 'is_sample' => 1, 'created_at' => $end, 'sent_at' => $end]);
    }
}

function remove_sample_data(): int {
    $n = 0;
    foreach (['comments', 'plan_comments', 'plans', 'recs', 'newsletters', 'users'] as $t) $n += q("DELETE FROM $t WHERE is_sample = 1")->rowCount();
    return $n;
}

function sample_counts(): array {
    $c = fn($t) => (int) val("SELECT COUNT(*) FROM $t WHERE is_sample = 1");
    return ['users' => $c('users'), 'recs' => $c('recs'), 'plans' => $c('plans'), 'newsletters' => $c('newsletters'), 'comments' => $c('comments') + $c('plan_comments')];
}
