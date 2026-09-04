<?php

declare(strict_types=1);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');

if (strtoupper($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require dirname(__DIR__) . '/src/bootstrap.php';

use App\Http\HttpException;
use App\Http\Request;
use App\Http\Response;
use App\Support\Migrate;
use App\Support\Uploads;

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
if (Uploads::sendFile('/' . trim($path, '/'))) {
    exit;
}

try {
    Uploads::ensure();
    Migrate::ensure();
    /** @var \App\Http\Router $router */
    $router = require dirname(__DIR__) . '/src/routes.php';
    $router->dispatch(Request::fromGlobals())->send();
} catch (HttpException $error) {
    Response::json(['error' => $error->getMessage()], $error->status)->send();
} catch (Throwable $error) {
    error_log($error->getMessage());
    $message = $error->getMessage();
    $status = str_contains($message, 'MySQL') || str_contains($message, 'phpMyAdmin') || str_contains($message, 'DATABASE') ? 503 : 500;
    Response::json([
        'error' => $status === 503 ? $message : 'Request failed. Please try again.',
    ], $status)->send();
}
