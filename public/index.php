<?php
require dirname(__DIR__) . '/src/bootstrap.php';
require ROOT . '/src/routes.php';
// Every page is private and personal, so tell Cloudways' cache (Varnish) and browsers never to store a copy.
header('Cache-Control: private, no-store, max-age=0');
header('X-Robots-Tag: noindex, nofollow');
dispatch($_SERVER['REQUEST_METHOD'], parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');
