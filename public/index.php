<?php
require dirname(__DIR__) . '/src/bootstrap.php';
require ROOT . '/src/routes.php';
dispatch($_SERVER['REQUEST_METHOD'], parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');
