<?php

declare(strict_types=1);

use App\Controllers\AuthController;
use App\Controllers\DashboardController;
use App\Controllers\ProductsController;
use App\Controllers\SalesController;
use App\Controllers\SettingsController;
use App\Http\Request;
use App\Http\Response;
use App\Http\Router;

$router = new Router();

$router->add('GET', '/', static fn (Request $_request) => Response::json([
    'name' => 'THE FRAGRANCE UNIVERSE',
    'ok' => true,
]), false);

$router->add('GET', '/api/health', static fn (Request $_request) => ['ok' => true], false);

$router->add('POST', '/api/auth/login', [AuthController::class, 'login'], false);
$router->add('GET', '/api/auth/me', [AuthController::class, 'me']);
$router->add('POST', '/api/auth/change-password', [AuthController::class, 'changePassword']);
$router->add('GET', '/api/auth/users', [AuthController::class, 'users'], true, true);
$router->add('POST', '/api/auth/users', [AuthController::class, 'createUser'], true, true);
$router->add('DELETE', '/api/auth/users/{id}', [AuthController::class, 'deleteUser'], true, true);

$router->add('GET', '/api/products', [ProductsController::class, 'list']);
$router->add('POST', '/api/products', [ProductsController::class, 'create']);
$router->add('GET', '/api/products/{id}', [ProductsController::class, 'show']);
$router->add('PUT', '/api/products/{id}', [ProductsController::class, 'update']);
$router->add('PATCH', '/api/products/{id}/stock', [ProductsController::class, 'adjustStock']);
$router->add('DELETE', '/api/products/{id}', [ProductsController::class, 'delete']);

$router->add('GET', '/api/sales', [SalesController::class, 'list']);
$router->add('POST', '/api/sales', [SalesController::class, 'create']);
$router->add('DELETE', '/api/sales', [SalesController::class, 'clear']);
$router->add('GET', '/api/sales/{id}', [SalesController::class, 'show']);
$router->add('DELETE', '/api/sales/{id}', [SalesController::class, 'delete']);

$router->add('GET', '/api/settings', [SettingsController::class, 'show']);
$router->add('PUT', '/api/settings', [SettingsController::class, 'update']);
$router->add('POST', '/api/settings/logo', [SettingsController::class, 'uploadLogo']);
$router->add('DELETE', '/api/settings/logo', [SettingsController::class, 'deleteLogo']);
$router->add('POST', '/api/settings/signature', [SettingsController::class, 'uploadSignature']);
$router->add('DELETE', '/api/settings/signature', [SettingsController::class, 'deleteSignature']);

$router->add('GET', '/api/dashboard', [DashboardController::class, 'show']);

return $router;
