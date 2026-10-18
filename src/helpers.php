<?php

function h($s): string { return htmlspecialchars((string) $s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }

function redirect(string $to, int $code = 303): never {
    header('Location: ' . $to, true, $code);
    exit;
}

function json_out($data, int $code = 200): never {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function not_found(): never {
    http_response_code(404);
    view('404', ['title' => 'Not found']);
    exit;
}

function post(string $k, string $default = ''): string { return trim((string) ($_POST[$k] ?? $default)); }
function get(string $k, string $default = ''): string { return trim((string) ($_GET[$k] ?? $default)); }
function post_str(string $k, int $max = 2000): ?string { $v = mb_substr(post($k), 0, $max); return $v === '' ? null : $v; }

/** Renders views/$name.php inside the layout (unless $bare). */
function view(string $name, array $vars = [], ?string $layout = 'layout'): void {
    extract($vars);
    ob_start();
    require ROOT . "/views/$name.php";
    $content = ob_get_clean();
    if ($layout) require ROOT . "/views/$layout.php";
    else echo $content;
}
function partial(string $name, array $vars = []): void { extract($vars); require ROOT . "/views/partials/$name.php"; }

function asset(string $path): string {
    $file = ROOT . '/public/assets/' . $path;
    return '/assets/' . $path . (is_file($file) ? '?v=' . filemtime($file) : '');
}

// ---------- CSRF ----------
function csrf_token(): string {
    $sid = $_COOKIE[SESSION_COOKIE] ?? ($_COOKIE['wam_pre'] ?? '');
    if (!$sid) {
        $sid = bin2hex(random_bytes(16));
        setcookie('wam_pre', $sid, ['path' => '/', 'httponly' => true, 'samesite' => 'Lax', 'secure' => is_https()]);
        $_COOKIE['wam_pre'] = $sid;
    }
    return hash_hmac('sha256', $sid, (string) config('secret', 'wam'));
}
function csrf_field(): string { return '<input type="hidden" name="_csrf" value="' . h(csrf_token()) . '">'; }
function check_csrf(): void {
    $t = $_POST['_csrf'] ?? ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if (!hash_equals(csrf_token(), (string) $t)) {
        http_response_code(419);
        exit('That form expired. Go back, refresh the page and try again.');
    }
}
function is_https(): bool { return str_starts_with(app_url(), 'https://'); }

// ---------- Time (displayed in New England time) ----------
function ny(string $iso = 'now'): DateTime { $d = new DateTime($iso); $d->setTimezone(new DateTimeZone(TZ)); return $d; }
function ny_parts(): array { $d = ny(); return ['date' => $d->format('Y-m-d'), 'weekday' => $d->format('D'), 'hhmm' => $d->format('H:i')]; }
function format_date(string $iso, string $fmt = 'M j, Y'): string { return ny($iso)->format($fmt); }
function format_day(string $day, string $fmt = 'D, M j'): string { return (new DateTime($day . ' 12:00:00'))->format($fmt); }
function format_time12(string $hhmm): string { return (new DateTime("2000-01-01 $hhmm"))->format('g:i A'); }
function time_ago(string $iso): string {
    $s = time() - strtotime($iso);
    if ($s < 60) return 'just now';
    if ($s < 3600) return floor($s / 60) . 'm ago';
    if ($s < 86400) return floor($s / 3600) . 'h ago';
    if ($s < 86400 * 7) return floor($s / 86400) . 'd ago';
    return ny($iso)->format(ny($iso)->format('Y') === ny()->format('Y') ? 'M j' : 'M j, Y');
}

// ---------- Text ----------
function title_key(string $t): string {
    $t = mb_strtolower($t);
    if (class_exists('Normalizer')) $t = preg_replace('/\p{Mn}+/u', '', Normalizer::normalize($t, Normalizer::FORM_KD));
    $t = str_replace('&', ' and ', $t);
    $t = preg_replace('/[^a-z0-9 ]+/', ' ', $t);
    $t = preg_replace('/^(the|a|an) /', '', trim(preg_replace('/\s+/', ' ', $t)));
    return trim(preg_replace('/\s+/', ' ', $t));
}
function clean_url(?string $u): ?string {
    $s = trim((string) $u);
    if ($s === '') return null;
    if (!preg_match('#^https?://#i', $s)) $s = 'https://' . $s;
    return filter_var($s, FILTER_VALIDATE_URL) && preg_match('#^https?://#i', $s) ? $s : null;
}
function url_key(?string $u): ?string {
    if (!$u || !($p = parse_url($u)) || empty($p['host'])) return null;
    parse_str($p['query'] ?? '', $qs);
    foreach (array_keys($qs) as $k) if (preg_match('/^(utm_|fbclid|gclid|igshid|si$|ref$|mc_)/', $k)) unset($qs[$k]);
    $q = http_build_query($qs);
    return strtolower(preg_replace('/^www\./', '', $p['host']) . rtrim($p['path'] ?? '', '/') . ($q ? "?$q" : ''));
}
function host_of(?string $u): string { return $u ? preg_replace('/^www\./', '', (string) parse_url($u, PHP_URL_HOST)) : ''; }
function parse_tags(?string $s): array {
    $out = [];
    foreach (preg_split('/[,#\n]/', (string) $s) as $raw) {
        $t = mb_substr(preg_replace('/\s+/', ' ', mb_strtolower(trim($raw))), 0, 30);
        if ($t !== '') $out[$t] = true;
    }
    return array_slice(array_keys($out), 0, 12);
}
function snippet(?string $s, int $n = 140): string {
    $t = trim(preg_replace('/\s+/', ' ', (string) $s));
    if (mb_strlen($t) <= $n) return $t;
    return preg_replace('/\s+\S*$/', '', mb_substr($t, 0, $n - 1)) . '…';
}
function first_name(?string $n): string { return explode(' ', trim((string) $n))[0] ?? ''; }
function plural(int $n, string $one, ?string $many = null): string { return $n . ' ' . ($n === 1 ? $one : ($many ?? $one . 's')); }

const NEW_ENGLAND = ['MA' => 'Massachusetts', 'CT' => 'Connecticut', 'RI' => 'Rhode Island', 'NH' => 'New Hampshire', 'VT' => 'Vermont', 'ME' => 'Maine'];
const OTHER_STATES = ['AL' => 'Alabama', 'AK' => 'Alaska', 'AZ' => 'Arizona', 'AR' => 'Arkansas', 'CA' => 'California', 'CO' => 'Colorado', 'DE' => 'Delaware', 'DC' => 'Washington, D.C.', 'FL' => 'Florida', 'GA' => 'Georgia', 'HI' => 'Hawaii', 'ID' => 'Idaho', 'IL' => 'Illinois', 'IN' => 'Indiana', 'IA' => 'Iowa', 'KS' => 'Kansas', 'KY' => 'Kentucky', 'LA' => 'Louisiana', 'MD' => 'Maryland', 'MI' => 'Michigan', 'MN' => 'Minnesota', 'MS' => 'Mississippi', 'MO' => 'Missouri', 'MT' => 'Montana', 'NE' => 'Nebraska', 'NV' => 'Nevada', 'NJ' => 'New Jersey', 'NM' => 'New Mexico', 'NY' => 'New York', 'NC' => 'North Carolina', 'ND' => 'North Dakota', 'OH' => 'Ohio', 'OK' => 'Oklahoma', 'OR' => 'Oregon', 'PA' => 'Pennsylvania', 'SC' => 'South Carolina', 'SD' => 'South Dakota', 'TN' => 'Tennessee', 'TX' => 'Texas', 'UT' => 'Utah', 'VA' => 'Virginia', 'WA' => 'Washington', 'WV' => 'West Virginia', 'WI' => 'Wisconsin', 'WY' => 'Wyoming'];

function place_line(array $r): string {
    return implode(', ', array_filter([$r['city'] ?? null, $r['state'] ?? null, (($r['country'] ?? '') && $r['country'] !== 'US') ? $r['country'] : null]));
}
function map_link(array $r): ?string {
    $q = implode(', ', array_filter([($r['place_name'] ?? '') ?: ($r['title'] ?? ''), $r['address'] ?? null, $r['city'] ?? null, $r['state'] ?? null, (($r['country'] ?? '') && $r['country'] !== 'US') ? $r['country'] : null]));
    return $q ? 'https://www.google.com/maps/search/?api=1&query=' . rawurlencode($q) : null;
}

// ---------- Look ----------
function hue(string $s): int {
    $hues = [28, 200, 340, 150, 260, 12, 95, 310, 180, 45];
    $h = 0;
    foreach (mb_str_split($s) as $c) $h = ($h * 31 + mb_ord($c)) & 0x7fffffff;
    return $hues[$h % count($hues)];
}
