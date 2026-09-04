<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Http\HttpException;
use App\Http\Request;
use App\Http\Response;
use App\Support\Database;
use App\Support\Jwt;

class AuthController
{
    public static function login(Request $request): Response
    {
        $username = strtolower(trim((string) ($request->body['username'] ?? '')));
        $password = (string) ($request->body['password'] ?? '');
        if ($username === '' || $password === '') {
            throw new HttpException(400, 'Username and password are required.');
        }

        $user = Database::instance()->queryOne(
            'SELECT * FROM users WHERE LOWER(username) = ?',
            [$username]
        );
        if (!$user || !password_verify($password, $user['password_hash'])) {
            throw new HttpException(401, 'Invalid username or password.');
        }

        return Response::json([
            'token' => Jwt::encode([
                'id' => (int) $user['id'],
                'username' => $user['username'],
                'role' => $user['role'],
            ]),
            'user' => [
                'id' => (int) $user['id'],
                'username' => $user['username'],
                'role' => $user['role'],
            ],
        ]);
    }

    public static function me(Request $request): array
    {
        $user = Database::instance()->queryOne(
            'SELECT id, username, role, created_at FROM users WHERE id = ?',
            [$request->user['id']]
        );
        if (!$user) {
            throw new HttpException(404, 'User not found.');
        }
        return $user;
    }

    public static function changePassword(Request $request): array
    {
        $current = (string) ($request->body['current_password'] ?? '');
        $next = (string) ($request->body['new_password'] ?? '');
        if ($current === '' || $next === '') {
            throw new HttpException(400, 'Current password and new password are required.');
        }
        if (strlen($next) < 6) {
            throw new HttpException(400, 'New password must be at least 6 characters.');
        }

        $db = Database::instance();
        $user = $db->queryOne('SELECT * FROM users WHERE id = ?', [$request->user['id']]);
        if (!$user) {
            throw new HttpException(404, 'User not found.');
        }
        if (!password_verify($current, $user['password_hash'])) {
            throw new HttpException(401, 'Current password is incorrect.');
        }

        $db->execute('UPDATE users SET password_hash = ? WHERE id = ?', [
            password_hash($next, PASSWORD_BCRYPT, ['cost' => 12]),
            $user['id'],
        ]);
        return ['ok' => true];
    }

    public static function users(Request $request): array
    {
        return Database::instance()->query(
            'SELECT id, username, role, created_at FROM users ORDER BY id'
        );
    }

    public static function createUser(Request $request): Response
    {
        $username = strtolower(trim((string) ($request->body['username'] ?? '')));
        $password = (string) ($request->body['password'] ?? '');
        $role = ($request->body['role'] ?? '') === 'admin' ? 'admin' : 'cashier';

        if ($username === '' || $password === '') {
            throw new HttpException(400, 'Username and password are required.');
        }
        if (strlen($password) < 6) {
            throw new HttpException(400, 'Password must be at least 6 characters.');
        }

        $db = Database::instance();
        if ($db->queryOne('SELECT 1 FROM users WHERE LOWER(username) = ?', [$username])) {
            throw new HttpException(409, 'That username is already taken.');
        }

        $db = Database::instance();
        $db->execute(
            'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
            [$username, password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]), $role]
        );
        $user = $db->queryOne(
            'SELECT id, username, role, created_at FROM users WHERE id = ?',
            [$db->lastId()]
        );
        return Response::json($user, 201);
    }

    public static function deleteUser(Request $request): array
    {
        $id = (int) $request->params['id'];
        if ($id === (int) $request->user['id']) {
            throw new HttpException(400, 'You cannot delete your own account.');
        }
        $count = Database::instance()->execute('DELETE FROM users WHERE id = ?', [$id]);
        if ($count === 0) {
            throw new HttpException(404, 'User not found.');
        }
        return ['ok' => true];
    }
}
