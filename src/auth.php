<?php

const SESSION_COOKIE = 'wam_session';
const SESSION_DAYS = 60;

function token(int $bytes = 32): string { return rtrim(strtr(base64_encode(random_bytes($bytes)), '+/', '-_'), '='); }
function sha(string $s): string { return hash('sha256', $s); }

function google_enabled(): bool { return setting('google_client_id') !== '' && setting('google_client_secret') !== ''; }

function create_session(string $userId): void {
    $t = token();
    $exp = time() + SESSION_DAYS * 86400;
    insert('sessions', ['id_hash' => sha($t), 'user_id' => $userId, 'created_at' => now(), 'expires_at' => gmdate('Y-m-d\TH:i:s.000\Z', $exp)]);
    q('UPDATE users SET last_seen_at = ? WHERE id = ?', [now(), $userId]);
    setcookie(SESSION_COOKIE, $t, ['expires' => $exp, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax', 'secure' => is_https()]);
    $_COOKIE[SESSION_COOKIE] = $t;
}

function current_user(): ?array {
    static $user = false;
    if ($user !== false) return $user;
    $t = $_COOKIE[SESSION_COOKIE] ?? '';
    $user = null;
    if (!$t) return null;
    $u = one("SELECT u.*, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id_hash = ? AND u.status = 'active'", [sha($t)]);
    if (!$u || $u['expires_at'] < now()) return null;
    if (admin_email() && strtolower($u['email']) === admin_email() && $u['role'] !== 'admin') {
        q("UPDATE users SET role = 'admin' WHERE id = ?", [$u['id']]);
        $u['role'] = 'admin';
    }
    return $user = $u;
}

function require_user(): array {
    $u = current_user();
    if (!$u) {
        if (str_starts_with($_SERVER['REQUEST_URI'] ?? '', '/api/')) json_out(['error' => 'Sign in first.'], 401);
        $next = $_SERVER['REQUEST_URI'] ?? '/';
        redirect('/login' . ($next !== '/' ? '?next=' . rawurlencode($next) : ''));
    }
    return $u;
}
function require_admin(): array {
    $u = require_user();
    if ($u['role'] !== 'admin') redirect('/');
    return $u;
}

function sign_out(): void {
    if ($t = $_COOKIE[SESSION_COOKIE] ?? '') q('DELETE FROM sessions WHERE id_hash = ?', [sha($t)]);
    setcookie(SESSION_COOKIE, '', ['expires' => 1, 'path' => '/']);
}

function find_open_invite(string $tok): ?array {
    $i = one('SELECT i.*, u.name AS inviter_name FROM invites i LEFT JOIN users u ON u.id = i.invited_by WHERE i.token = ?', [$tok]);
    if (!$i || $i['revoked_at'] || $i['accepted_at'] || $i['expires_at'] < now()) return null;
    return $i;
}

/** When on, anyone with an email address can join without an invite (the founder can switch it off in Settings → Members). */
function open_signup(): bool { return setting('open_signup') === '1'; }

function email_allowed(string $email): bool {
    $email = strtolower(trim($email));
    if (admin_email() && $email === admin_email()) return true;
    $u = one('SELECT status FROM users WHERE email = ?', [$email]);
    if ($u) return $u['status'] === 'active';
    if (open_signup()) return true;
    return (bool) one('SELECT id FROM invites WHERE email = ? AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > ?', [$email, now()]);
}

/** Finds or creates the member for a verified email. Returns [user|null, error|null, created]. */
function complete_sign_in(string $email, ?string $name = null, ?string $image = null, ?string $inviteToken = null): array {
    $email = strtolower(trim($email));
    $u = one('SELECT * FROM users WHERE email = ?', [$email]);
    if ($u) {
        if ($u['status'] !== 'active') return [null, 'removed', false];
        if ($image && !$u['image']) q('UPDATE users SET image = ? WHERE id = ?', [$image, $u['id']]);
        if ($inviteToken) q('UPDATE invites SET accepted_at = ? WHERE token = ? AND accepted_at IS NULL', [now(), $inviteToken]);
        return [$u, null, false];
    }
    $invite = $inviteToken ? find_open_invite($inviteToken) : null;
    $invite ??= one('SELECT * FROM invites WHERE email = ? AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > ? ORDER BY created_at DESC', [$email, now()]);
    $founder = admin_email() && $email === admin_email();
    if (!$invite && !$founder && !open_signup()) return [null, 'not-invited', false];

    $fallback = preg_split('/[._+-]/', explode('@', $email)[0])[0];
    $id = new_id();
    insert('users', [
        'id' => $id, 'email' => $email, 'name' => trim($name ?: ($invite['name'] ?? '') ?: ucfirst($fallback)),
        'image' => $image, 'role' => $founder ? 'admin' : 'member', 'status' => 'active', 'created_at' => now(),
    ]);
    if ($invite) q('UPDATE invites SET accepted_at = ? WHERE id = ?', [now(), $invite['id']]);
    return [one('SELECT * FROM users WHERE id = ?', [$id]), null, true];
}

function safe_next(?string $p): ?string { return ($p && str_starts_with($p, '/') && !str_starts_with($p, '//')) ? $p : null; }

/** Returns [ok, reason, devLink]. */
function send_magic_link(string $email, ?string $next = null, ?string $inviteToken = null): array {
    $email = strtolower(trim($email));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) return [false, 'invalid', null];
    $invite = $inviteToken ? find_open_invite($inviteToken) : null;
    if (!$invite && !email_allowed($email)) return [false, 'not-invited', null];
    // When the link can't be emailed it's shown on screen instead. With sign-up open, that would let anyone type a
    // member's address and walk into their account, so only brand-new addresses (or invite links, which are secret) get it.
    $canShow = $invite || !open_signup() || !one('SELECT id FROM users WHERE email = ?', [$email]);
    if (!email_enabled() && !$canShow) return [false, 'needs-email', null];
    if ((int) val('SELECT COUNT(*) FROM login_tokens WHERE email = ? AND created_at > ?', [$email, iso_ago(1 / 24)]) >= 6) return [false, 'too-many', null];
    $url = new_login_link($email, safe_next($next), $invite['token'] ?? null, 1200);
    if (!email_enabled()) return [true, null, $url];
    $sent = send_email($email, 'Your sign-in link for Worth a Mention',
        simple_email('Come on in.', 'Tap the button to sign in. The link works once and expires in 20 minutes.', 'Sign in to Worth a Mention', $url),
        "Sign in to Worth a Mention: $url\n\nThe link works once and expires in 20 minutes.");
    // Resend refuses to deliver when the sending domain isn't verified yet. Don't claim it was sent.
    if (!$sent) return $canShow ? [true, null, $url] : [false, 'email-failed', null];
    return [true, null, null];
}

/** Makes a one-time sign-in link. The founder can also hand these out from Settings → Members. */
function new_login_link(string $email, ?string $next = null, ?string $inviteToken = null, int $seconds = 1200): string {
    $t = token();
    insert('login_tokens', ['token_hash' => sha($t), 'email' => $email, 'next_path' => $next, 'invite_token' => $inviteToken, 'created_at' => now(), 'expires_at' => gmdate('Y-m-d\TH:i:s.000\Z', time() + $seconds)]);
    return app_url() . '/auth/verify?token=' . $t;
}

function consume_magic_link(string $t): ?array {
    $row = one('SELECT * FROM login_tokens WHERE token_hash = ?', [sha($t)]);
    if (!$row || $row['used_at'] || $row['expires_at'] < now()) return null;
    q('UPDATE login_tokens SET used_at = ? WHERE token_hash = ?', [now(), sha($t)]);
    return $row;
}

function send_invite_email(array $inv, string $inviter) {
    $url = app_url() . '/join/' . $inv['token'];
    $hi = !empty($inv['name']) ? h($inv['name']) . ', ' : '';
    return send_email($inv['email'], "$inviter saved you a seat at Worth a Mention",
        simple_email("{$hi}you're on the list.", h($inviter) . ' invited you to Worth a Mention, the private spot where the group keeps all the good stuff that comes up in conversation. Restaurants, shows, recipes, trips. The things you swore you\'d remember.', 'Accept the invite', $url, "This invite is just for you and expires in 14 days. Link not working? Paste this in your browser:"),
        "$inviter invited you to Worth a Mention.\n\nAccept: $url\n\nThis invite expires in 14 days.");
}

const AUTH_ERRORS = [
    'not-invited' => "That address isn't on the guest list yet. Ask the group's founder for an invite.",
    'needs-email' => "That address already has an account, and email isn't connected yet, so we can't send the link safely. Use Google, or ask the group's founder for a sign-in link.",
    'email-failed' => "We couldn't send the sign-in email just now. Use Google, or ask the group's founder for a sign-in link.",
    'removed' => "This account isn't active anymore. If that's a mistake, check with the group's founder.",
    'expired' => 'That link has expired or was already used. Request a fresh one below.',
    'google' => "Google sign-in didn't go through. Give it another try.",
    'google-off' => "Google sign-in isn't set up yet. Use an email link for now.",
    'invalid' => "That doesn't look like an email address.",
    'too-many' => "That's a lot of sign-in links. Wait a little while and try again.",
];
