<?php
// The Thursday newsletter. Every line comes from real group activity.

function digest_pick(array $arr, int $seed) { return $arr[abs($seed) % count($arr)]; }
function digest_seed(string $s): int { return (int) hexdec(substr(md5($s), 0, 7)); }

function age_label(string $iso): string {
    $days = (int) round((time() - strtotime($iso)) / 86400);
    if ($days < 60) return round($days / 7) . ' weeks ago';
    if ($days < 365) return round($days / 30) . ' months ago';
    return $days < 730 ? 'about a year ago' : round($days / 365) . ' years ago';
}

const DIGEST_REC_SQL = "SELECT r.id, r.title, c.emoji, c.name AS category, u.name AS author, r.why, r.description, r.city, r.state, r.created_at, r.image_url,
  (SELECT p.file FROM rec_photos p WHERE p.rec_id = r.id ORDER BY p.sort LIMIT 1) AS photo,
  (SELECT AVG(stars) FROM ratings WHERE rec_id = r.id) AS avg, (SELECT COUNT(*) FROM ratings WHERE rec_id = r.id) AS ratings,
  (SELECT COUNT(*) FROM interests WHERE rec_id = r.id) AS interest
  FROM recs r LEFT JOIN categories c ON c.id = r.category_id LEFT JOIN users u ON u.id = r.created_by";

function digest_rec(array $r): array {
    return [
        'id' => $r['id'], 'title' => $r['title'], 'emoji' => $r['emoji'] ?: '✨', 'category' => $r['category'] ?: 'Other', 'author' => $r['author'] ?: 'Someone',
        'why' => snippet($r['why'] ?: $r['description'], 150), 'avg' => $r['avg'] !== null ? round((float) $r['avg'], 1) : null, 'ratings' => (int) $r['ratings'],
        'place' => implode(', ', array_filter([$r['city'], $r['state']])), 'cover' => $r['image_url'] ?: ($r['photo'] ? '/uploads/' . $r['photo'] : null),
    ];
}

function build_digest(string $start, string $end, string $issueDate): array {
    $seed = digest_seed($issueDate);
    $new = all(DIGEST_REC_SQL . ' WHERE r.created_at >= ? AND r.created_at < ? ORDER BY r.created_at DESC', [$start, $end]);
    $newIds = array_column($new, 'id');
    $comments = (int) val('SELECT COUNT(*) FROM comments WHERE created_at >= ? AND created_at < ?', [$start, $end])
        + (int) val('SELECT COUNT(*) FROM plan_comments WHERE created_at >= ? AND created_at < ?', [$start, $end]);
    $ratings = (int) val('SELECT COUNT(*) FROM ratings WHERE updated_at >= ? AND updated_at < ?', [$start, $end]);

    // Popular discussions on recommendations and plans.
    $recTalk = array_map(fn($x) => $x + ['kind' => 'rec'], all("SELECT r.id, r.title, c.emoji, COUNT(*) AS n, MAX(cm.created_at) AS last FROM comments cm JOIN recs r ON r.id = cm.rec_id LEFT JOIN categories c ON c.id = r.category_id
        WHERE cm.created_at >= ? AND cm.created_at < ? GROUP BY r.id, r.title, c.emoji ORDER BY n DESC, last DESC LIMIT 6", [$start, $end]));
    $planTalk = array_map(fn($x) => $x + ['kind' => 'plan'], all('SELECT p.id, p.title, p.emoji, COUNT(*) AS n, MAX(pc.created_at) AS last FROM plan_comments pc JOIN plans p ON p.id = pc.plan_id
        WHERE pc.created_at >= ? AND pc.created_at < ? GROUP BY p.id, p.title, p.emoji ORDER BY n DESC LIMIT 3', [$start, $end]));
    $all = array_merge($recTalk, $planTalk);
    usort($all, fn($a, $b) => (int) $b['n'] <=> (int) $a['n']);
    $talk = [];
    foreach ($all as $t) {
        $n = (int) $t['n'];
        if ($t['kind'] === 'rec' && in_array($t['id'], $newIds, true) && $n < 3) continue;
        if ($n < 2 && count($talk) >= 1) continue;
        [$table, $col] = $t['kind'] === 'rec' ? ['comments', 'rec_id'] : ['plan_comments', 'plan_id'];
        $people = array_column(all("SELECT DISTINCT u.name FROM $table x JOIN users u ON u.id = x.user_id WHERE x.$col = ? AND x.created_at >= ? AND x.created_at < ?", [$t['id'], $start, $end]), 'name');
        $latest = one("SELECT u.name, x.body FROM $table x JOIN users u ON u.id = x.user_id WHERE x.$col = ? ORDER BY x.created_at DESC LIMIT 1", [$t['id']]);
        $talk[] = ['kind' => $t['kind'], 'id' => $t['id'], 'title' => $t['title'], 'emoji' => $t['emoji'] ?: '💬', 'count' => $n, 'people' => $people, 'latest' => ['name' => $latest['name'] ?? '', 'body' => snippet($latest['body'] ?? '', 160)]];
        if (count($talk) >= 3) break;
    }

    // From the vault: an older favourite not featured recently.
    $featured = [];
    foreach (all('SELECT data FROM newsletters ORDER BY issue_date DESC LIMIT 12') as $n) {
        $d = json_decode($n['data'], true);
        if (!empty($d['rediscover']['id'])) $featured[] = $d['rediscover']['id'];
    }
    $cutoff = gmdate('Y-m-d\TH:i:s.000\Z', strtotime($end) - 30 * 86400);
    $cands = all(DIGEST_REC_SQL . ' WHERE r.created_at < ?', [$cutoff]);
    usort($cands, fn($a, $b) => (($b['avg'] ?? 3.5) * 2 + $b['interest'] + min($b['ratings'], 4)) <=> (($a['avg'] ?? 3.5) * 2 + $a['interest'] + min($a['ratings'], 4)));
    $cands = array_values(array_filter(array_slice($cands, 0, 15), fn($r) => !in_array($r['id'], $featured, true) && !in_array($r['id'], $newIds, true)));
    $re = $cands ? digest_pick(array_slice($cands, 0, 6), $seed) : null;
    $rediscover = $re ? digest_rec($re) + ['age' => age_label($re['created_at'])] : null;

    // Coming up: open plans with a date ahead, or ones that saw activity.
    $plans = [];
    $rows = all("SELECT p.id, p.title, p.emoji, p.target_date,
        (SELECT COUNT(*) FROM plan_items WHERE plan_id = p.id) AS options,
        (SELECT COUNT(DISTINCT v.user_id) FROM plan_votes v JOIN plan_items i ON i.id = v.item_id WHERE i.plan_id = p.id) AS voters
        FROM plans p WHERE p.status = 'open' AND (p.target_date >= ? OR p.updated_at >= ? OR p.target_date IS NULL)
        ORDER BY p.target_date IS NULL, p.target_date, p.updated_at DESC LIMIT 3", [$issueDate, $start]);
    foreach ($rows as $p) {
        $leader = one('SELECT r.title, COUNT(v.user_id) AS votes FROM plan_items i JOIN recs r ON r.id = i.rec_id LEFT JOIN plan_votes v ON v.item_id = i.id
            WHERE i.plan_id = ? GROUP BY i.id, r.title, i.created_at HAVING COUNT(v.user_id) > 0 ORDER BY votes DESC, i.created_at LIMIT 1', [$p['id']]);
        $plans[] = ['id' => $p['id'], 'title' => $p['title'], 'emoji' => $p['emoji'], 'when' => $p['target_date'] ? format_day($p['target_date']) : null,
            'options' => (int) $p['options'], 'voters' => (int) $p['voters'], 'leader' => $leader ? ['title' => $leader['title'], 'votes' => (int) $leader['votes']] : null];
    }

    $n = count($new);
    $quiet = $n === 0 && !$talk;
    if ($quiet) {
        $intro = digest_pick(["A quiet week around here. Either everyone stayed in, or the good stuff is still waiting to be mentioned.", "Not a peep this week. We'll assume you were all too busy enjoying things to write them down.", "The group chat was quiet this week, so here's a little something from the vault instead."], $seed);
    } elseif ($n >= 6) {
        $intro = digest_pick(["A big one. $n new recommendations landed this week, so somebody's been getting out.", "$n new things worth mentioning this week. You've all been busy."], $seed);
    } elseif ($n > 0) {
        $intro = digest_pick([($n === 1 ? 'One new recommendation' : "$n new recommendations") . ' this week, plus whatever you were all arguing about in the comments.', "Here's what the group's been into this week. " . ($n === 1 ? 'One fresh find' : "$n fresh finds") . ', and a few conversations worth catching up on.'], $seed);
    } else {
        $intro = "No new recommendations this week, but the comments were busy. Here's what you missed.";
    }
    $signoff = digest_pick(['Heard something good? Mention it.', 'Go forth and recommend.', 'See you next Thursday. Bring snacks (and recommendations).', "Remember: if you liked it, it's worth a mention."], $seed + 1);

    return ['intro' => $intro, 'quiet' => $quiet, 'stats' => ['recs' => $n, 'comments' => $comments, 'ratings' => $ratings],
        'newRecs' => array_map('digest_rec', array_slice($new, 0, 8)), 'moreNew' => max(0, $n - 8), 'talk' => $talk, 'rediscover' => $rediscover, 'plans' => $plans, 'signoff' => $signoff];
}

function digest_subject(array $d, string $issueDate): string {
    $day = format_day($issueDate, 'M j');
    if ($d['quiet']) return "Worth a Mention · $day: a quiet week, and one from the vault";
    $lead = $d['newRecs'][0] ?? null;
    if ($lead && $d['stats']['recs'] > 1) return "Worth a Mention · $day: {$lead['title']} and " . ($d['stats']['recs'] - 1) . ' more';
    if ($lead) return "Worth a Mention · $day: {$lead['title']}";
    return "Worth a Mention · $day: the week in comments";
}

function digest_period_start(string $end): string {
    $last = val('SELECT period_end FROM newsletters WHERE is_sample = 0 ORDER BY issue_date DESC LIMIT 1');
    $weekAgo = gmdate('Y-m-d\TH:i:s.000\Z', strtotime($end) - 7 * 86400);
    return $last && $last > $weekAgo ? $last : $weekAgo;
}

function preview_digest(): array {
    $end = now();
    $issue = ny_parts()['date'];
    $data = build_digest(digest_period_start($end), $end, $issue);
    return ['data' => $data, 'subject' => digest_subject($data, $issue), 'issue_date' => $issue];
}

/** Creates today's edition (if it doesn't exist yet) and emails it. Returns [id, created, sent]. */
function publish_digest(?string $issueDate = null, bool $send = true): array {
    $end = now();
    $issueDate ??= ny_parts()['date'];
    if ($id = val('SELECT id FROM newsletters WHERE issue_date = ?', [$issueDate])) return [$id, false, 0];
    $start = digest_period_start($end);
    $data = build_digest($start, $end, $issueDate);
    $subject = digest_subject($data, $issueDate);
    $edition = (int) val('SELECT COUNT(*) FROM newsletters WHERE is_sample = 0') + 1;
    $id = new_id();
    try {
        insert('newsletters', ['id' => $id, 'edition' => $edition, 'issue_date' => $issueDate, 'subject' => $subject, 'data' => json_encode($data, JSON_UNESCAPED_UNICODE),
            'period_start' => $start, 'period_end' => $end, 'created_at' => now()]);
    } catch (PDOException $e) {
        return [null, false, 0]; // someone else published it a moment ago
    }
    $sent = 0;
    if ($send) {
        foreach (all("SELECT email, name FROM users WHERE status = 'active' AND email_digest = 1 AND is_sample = 0") as $p) {
            [$html, $text] = render_digest_email($data, $subject, $issueDate, $edition, $id, $p['name']);
            if (send_email($p['email'], $subject, $html, $text)) $sent++;
        }
        q('UPDATE newsletters SET sent_at = ?, sent_count = ? WHERE id = ?', [now(), $sent, $id]);
    }
    return [$id, true, $sent];
}

function send_test_digest(array $to): bool {
    $p = preview_digest();
    [$html, $text] = render_digest_email($p['data'], $p['subject'], $p['issue_date'], 0, null, $to['name']);
    return send_email($to['email'], '[Preview] ' . $p['subject'], $html, $text);
}

/** Runs from cron (and as a backup, from normal page visits). Publishes Thursday after the set time. */
function maybe_run_scheduled_digest(): array {
    if (setting('digest_enabled') !== '1') return ['ran' => false, 'reason' => 'disabled'];
    $ny = ny_parts();
    if ($ny['weekday'] !== 'Thu') return ['ran' => false, 'reason' => 'not-thursday'];
    $time = setting('digest_time') ?: '08:00';
    if ($ny['hhmm'] < $time) return ['ran' => false, 'reason' => "waiting-until-$time"];
    if (val('SELECT id FROM newsletters WHERE issue_date = ?', [$ny['date']])) return ['ran' => false, 'reason' => 'already-published'];
    [$id, , $sent] = publish_digest($ny['date']);
    error_log("[digest] Published edition for {$ny['date']}; emailed $sent members.");
    return ['ran' => true, 'id' => $id, 'sent' => $sent];
}

function render_digest_email(array $d, string $subject, string $issueDate, int $edition, ?string $id, string $recipient): array {
    $C = ['bg' => '#f7f7f7', 'card' => '#ffffff', 'line' => '#ebebeb', 'text' => '#222222', 'soft' => '#484848', 'mute' => '#717171', 'gold' => '#e5484d'];
    $u = app_url();
    $web = $id ? "$u/newsletter/$id" : "$u/newsletter";
    $first = first_name($recipient);
    $recRow = function (array $r) use ($C, $u) {
        $thumb = ($r['cover'] && preg_match('#^https?://#', $r['cover']))
            ? '<td width="64" valign="top" style="padding-right:14px;"><img src="' . h($r['cover']) . '" width="64" height="64" alt="" style="display:block;width:64px;height:64px;object-fit:cover;border-radius:10px;"></td>'
            : '<td width="64" valign="top" style="padding-right:14px;"><div style="width:64px;height:64px;border-radius:10px;background:#fdecee;text-align:center;line-height:64px;font-size:28px;">' . $r['emoji'] . '</div></td>';
        $stars = $r['avg'] ? '<span style="color:' . $C['text'] . '">★ ' . number_format($r['avg'], 1) . '</span> <span style="color:' . $C['mute'] . '">(' . $r['ratings'] . ')</span>' : '<span style="color:' . $C['mute'] . '">Not rated yet</span>';
        return '<tr><td style="padding:14px 0;border-top:1px solid ' . $C['line'] . ';"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>' . $thumb
            . '<td valign="top"><a href="' . "$u/r/{$r['id']}" . '" style="color:' . $C['text'] . ';font-size:16px;font-weight:700;text-decoration:none;">' . h($r['title']) . '</a>'
            . '<div style="font-size:12px;color:' . $C['mute'] . ';margin:3px 0 6px;">' . $r['emoji'] . ' ' . h($r['category']) . ($r['place'] ? ' · ' . h($r['place']) : '') . ' · from ' . h($r['author']) . (!empty($r['age']) ? ' · ' . h($r['age']) : '') . '</div>'
            . ($r['why'] ? '<div style="font-size:14px;line-height:1.5;color:' . $C['soft'] . ';">“' . h($r['why']) . '”</div>' : '')
            . '<div style="font-size:12px;margin-top:6px;">' . $stars . '</div></td></tr></table></td></tr>';
    };
    $section = fn($title, $body) => '<tr><td style="padding:28px 28px 8px;"><div style="font-weight:700;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:' . $C['gold'] . ';margin-bottom:6px;">' . $title . '</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0">' . $body . '</table></td></tr>';
    $parts = '';
    if ($d['newRecs']) $parts .= $section('Fresh this week', implode('', array_map($recRow, $d['newRecs'])) . ($d['moreNew'] ? '<tr><td style="padding:12px 0;border-top:1px solid ' . $C['line'] . ';font-size:14px;"><a href="' . $u . '/browse?sort=new" style="color:' . $C['gold'] . ';text-decoration:none;">Plus ' . $d['moreNew'] . ' more on the site →</a></td></tr>' : ''));
    if ($d['talk']) $parts .= $section('Popular discussions', implode('', array_map(fn($t) => '<tr><td style="padding:14px 0;border-top:1px solid ' . $C['line'] . ';"><a href="' . $u . '/' . ($t['kind'] === 'rec' ? 'r' : 'plans') . '/' . $t['id'] . '" style="color:' . $C['text'] . ';font-size:15px;font-weight:700;text-decoration:none;">' . $t['emoji'] . ' ' . h($t['title']) . '</a>'
        . '<div style="font-size:12px;color:' . $C['mute'] . ';margin:3px 0 6px;">' . plural($t['count'], 'comment') . ' from ' . h(implode(', ', $t['people'])) . '</div>'
        . ($t['latest']['body'] ? '<div style="font-size:14px;line-height:1.5;color:' . $C['soft'] . ';"><b style="color:' . $C['text'] . ';">' . h(first_name($t['latest']['name'])) . ':</b> ' . h($t['latest']['body']) . '</div>' : '') . '</td></tr>', $d['talk'])));
    if ($d['rediscover']) $parts .= $section('From the vault', '<tr><td style="padding:0 0 4px;font-size:14px;color:' . $C['soft'] . ';">Worth a second look, in case it slipped through the cracks.</td></tr>' . $recRow($d['rediscover']));
    if ($d['plans']) $parts .= $section('Coming up', implode('', array_map(fn($p) => '<tr><td style="padding:14px 0;border-top:1px solid ' . $C['line'] . ';"><a href="' . $u . '/plans/' . $p['id'] . '" style="color:' . $C['text'] . ';font-size:15px;font-weight:700;text-decoration:none;">' . $p['emoji'] . ' ' . h($p['title']) . '</a>'
        . '<div style="font-size:12px;color:' . $C['mute'] . ';margin-top:3px;">' . ($p['when'] ? h($p['when']) . ' · ' : '') . plural($p['options'], 'option') . ' · ' . $p['voters'] . ' voted</div>'
        . '<div style="font-size:14px;color:' . $C['soft'] . ';margin-top:6px;">' . ($p['leader'] ? 'In the lead: <b style="color:' . $C['text'] . ';">' . h($p['leader']['title']) . '</b> with ' . plural($p['leader']['votes'], 'vote') : 'No votes yet. Go break the tie before there is one.') . '</div></td></tr>', $d['plans'])));
    if ($d['quiet']) $parts .= '<tr><td style="padding:24px 28px 0;"><a href="' . $u . '/add" style="display:inline-block;background:' . $C['gold'] . ';color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:11px 18px;border-radius:10px;">Add something in ten seconds</a></td></tr>';
    $s = $d['stats'];
    $stats = ($s['recs'] || $s['comments'] || $s['ratings']) ? '<p style="font-size:13px;color:' . $C['mute'] . ';margin:10px 0 0;">' . "{$s['recs']} new · {$s['comments']} comments · {$s['ratings']} ratings</p>" : '';
    $html = '<!doctype html><html><head><meta name="viewport" content="width=device-width"><meta name="color-scheme" content="light"></head>'
        . '<body style="margin:0;background:' . $C['bg'] . ';padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Helvetica,Arial,sans-serif;color:' . $C['text'] . ';">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><table role="presentation" width="100%" style="max-width:600px;background:' . $C['card'] . ';border:1px solid ' . $C['line'] . ';border-radius:18px;" cellpadding="0" cellspacing="0">'
        . '<tr><td style="padding:28px 28px 0;"><div style="font-size:12px;color:' . $C['mute'] . ';">' . ($edition ? "No. $edition · " : '') . format_day($issueDate, 'l, F j') . ' · <a href="' . $web . '" style="color:' . $C['mute'] . ';">View on the site</a></div>'
        . '<div style="font-weight:800;letter-spacing:-0.02em;font-size:28px;color:' . $C['text'] . ';margin:10px 0 4px;">Worth a Mention</div><div style="font-size:13px;color:' . $C['gold'] . ';">Good things. Worth remembering.</div>'
        . '<p style="font-size:16px;line-height:1.6;color:' . $C['soft'] . ';margin:20px 0 0;">Hi ' . h($first) . '. ' . h($d['intro']) . '</p>' . $stats . '</td></tr>'
        . $parts
        . '<tr><td style="padding:28px;"><div style="border-top:1px solid ' . $C['line'] . ';padding-top:18px;font-size:14px;color:' . $C['soft'] . ';">' . h($d['signoff']) . '</div>'
        . '<div style="font-size:12px;color:' . $C['mute'] . ';margin-top:10px;">You\'re getting this because you\'re one of the group. <a href="' . $u . '/me" style="color:' . $C['mute'] . ';">Email settings</a></div></td></tr>'
        . '</table></td></tr></table></body></html>';
    $lines = ['Worth a Mention · ' . format_day($issueDate, 'F j'), '', "Hi $first. {$d['intro']}", ''];
    if ($d['newRecs']) { $lines[] = 'FRESH THIS WEEK'; foreach ($d['newRecs'] as $r) $lines[] = "- {$r['title']} ({$r['category']}, from {$r['author']}) $u/r/{$r['id']}"; $lines[] = ''; }
    if ($d['talk']) { $lines[] = 'POPULAR DISCUSSIONS'; foreach ($d['talk'] as $t) $lines[] = "- {$t['title']}: {$t['count']} comments $u/" . ($t['kind'] === 'rec' ? 'r' : 'plans') . "/{$t['id']}"; $lines[] = ''; }
    if ($d['rediscover']) { $lines[] = 'FROM THE VAULT'; $lines[] = "- {$d['rediscover']['title']} $u/r/{$d['rediscover']['id']}"; $lines[] = ''; }
    if ($d['plans']) { $lines[] = 'COMING UP'; foreach ($d['plans'] as $p) $lines[] = "- {$p['title']}" . ($p['when'] ? " ({$p['when']})" : '') . " $u/plans/{$p['id']}"; $lines[] = ''; }
    $lines[] = $d['signoff'];
    $lines[] = '';
    $lines[] = "Read it on the site: $web";
    return [$html, implode("\n", $lines)];
}
