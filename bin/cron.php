<?php
// Run from the server's cron every 15 minutes: php /path/to/app/bin/cron.php
// Publishes the Thursday newsletter once the set time has passed. Safe to run as often as you like.
if (PHP_SAPI !== 'cli') exit;
require dirname(__DIR__) . '/src/bootstrap.php';
if (!installed()) exit("Not set up yet. Visit the site in a browser first.\n");
echo json_encode(maybe_run_scheduled_digest()), "\n";
