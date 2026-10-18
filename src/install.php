<?php
// One-time setup page. It only exists until storage/config.php is written.

function install_page(string $method): void {
    $https = ($_SERVER['HTTPS'] ?? '') === 'on' || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
    $guess = ($https ? 'https://' : 'http://') . ($_SERVER['HTTP_HOST'] ?? 'localhost');
    $v = [
        'db_driver' => getenv('WAM_DB') === 'sqlite' ? 'sqlite' : 'mysql', 'db_host' => 'localhost', 'db_name' => '', 'db_user' => '', 'db_pass' => '', 'db_path' => '',
        'app_url' => $guess, 'admin_email' => '', 'samples' => '1',
    ];
    $error = '';
    $done = false;
    if ($method === 'POST') {
        foreach ($v as $k => $_) $v[$k] = trim((string) ($_POST[$k] ?? ($k === 'samples' ? '' : $v[$k])));
        $v['app_url'] = rtrim($v['app_url'], '/');
        try {
            if (!filter_var($v['admin_email'], FILTER_VALIDATE_EMAIL)) throw new RuntimeException("The founder email doesn't look right.");
            if (!preg_match('#^https?://#', $v['app_url'])) throw new RuntimeException('The site address should start with https:// (or http://).');
            if (!is_writable(STORAGE)) throw new RuntimeException('The server can\'t write to the storage folder (' . STORAGE . '). In Cloudways, use Application Settings → "Reset File Permission", then try again.');
            $cfg = ['app_url' => $v['app_url'], 'admin_email' => strtolower($v['admin_email']), 'secret' => bin2hex(random_bytes(32)), 'cron_key' => bin2hex(random_bytes(16))];
            if ($v['db_driver'] === 'sqlite') {
                $cfg += ['db_driver' => 'sqlite', 'db_path' => $v['db_path'] ?: STORAGE . '/wam.sqlite'];
            } else {
                [$host, $port] = array_pad(explode(':', $v['db_host'] ?: 'localhost', 2), 2, 3306);
                $cfg += ['db_driver' => 'mysql', 'db_host' => $host, 'db_port' => (int) $port, 'db_name' => $v['db_name'], 'db_user' => $v['db_user'], 'db_pass' => $_POST['db_pass'] ?? ''];
                if (!$cfg['db_name'] || !$cfg['db_user']) throw new RuntimeException('Fill in the database name and username (Cloudways shows them under Access Details → MySQL).');
            }
            $GLOBALS['CONFIG'] = $cfg;
            try {
                db();
            } catch (PDOException $e) {
                throw new RuntimeException("Couldn't connect to the database. Double-check the name, username and password. (" . $e->getMessage() . ')');
            }
            migrate();
            if ($v['samples'] === '1') load_sample_data();
            @mkdir(STORAGE . '/uploads', 0775, true);
            if (file_put_contents(STORAGE . '/config.php', "<?php\n// Written by the setup page. Keep this file private.\nreturn " . var_export($cfg, true) . ";\n") === false) {
                throw new RuntimeException("Couldn't save the settings file in the storage folder.");
            }
            @chmod(STORAGE . '/config.php', 0640);
            $done = true;
        } catch (Throwable $e) {
            $GLOBALS['CONFIG'] = null;
            $error = $e->getMessage();
        }
    }
    view('install', ['title' => 'Set up', 'v' => $v, 'error' => $error, 'done' => $done], 'layout_auth');
}
