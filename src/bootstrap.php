<?php
declare(strict_types=1);

// Worth a Mention: plain PHP 8 + MySQL (or SQLite for local testing). No Composer needed.

define('ROOT', dirname(__DIR__));
define('STORAGE', getenv('WAM_STORAGE') ?: ROOT . '/storage');
define('TZ', 'America/New_York');

date_default_timezone_set('UTC');
mb_internal_encoding('UTF-8');

$cfgFile = STORAGE . '/config.php';
$GLOBALS['CONFIG'] = is_file($cfgFile) ? require $cfgFile : null;

function config(string $key, $default = null) {
    return $GLOBALS['CONFIG'][$key] ?? $default;
}
function installed(): bool { return $GLOBALS['CONFIG'] !== null; }
function app_url(): string { return rtrim((string) config('app_url', ''), '/'); }
function admin_email(): string { return strtolower(trim((string) config('admin_email', ''))); }

require __DIR__ . '/db.php';
require __DIR__ . '/helpers.php';
require __DIR__ . '/auth.php';
require __DIR__ . '/mail.php';
require __DIR__ . '/recs.php';
require __DIR__ . '/digest.php';
require __DIR__ . '/unfurl.php';
require __DIR__ . '/sample.php';
require __DIR__ . '/ui.php';
