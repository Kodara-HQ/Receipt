<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Http\HttpException;
use App\Http\Request;
use App\Http\Response;
use App\Support\Jwt;
use App\Support\Store;

class AuthController
{
    public static function login(Request $request): Response
    {
        $username = strtolower(trim((string) ($request->body['username'] ?? '')));
        $password = (string) ($request->body['password'] ?? '');
        if ($username === '' || $password === '') {
            throw new HttpException(400, 'Username and password are required.');
        }

        $user = null;
        foreach (Store::all()['users'] as $row) {
            if (strtolower((string) $row['username']) === $username) {
                $user = $row;
                break;
            }
        }
        if (!$user || !password_verify($password, $user['password_hash'])) {
            throw new HttpException(401, 'Invalid username or password.');
        }

        return Response::json([
            'token' => Jwt::encode([
                'id' => (int) $user['id'],
                'username' => $user['username'],
                'role' => $user['role'],
            ]),
            'user' => Store::publicUser($user),
        ]);
    }

    public static function me(Request $request): array
    {
        foreach (Store::all()['users'] as $row) {
            if ((int) $row['id'] === (int) $request->user['id']) {
                return Store::publicUser($row);
            }
        }
        throw new HttpException(404, 'User not found.');
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

        Store::mutate(function (array &$data) use ($request, $current, $next) {
            foreach ($data['users'] as &$user) {
                if ((int) $user['id'] !== (int) $request->user['id']) {
                    continue;
                }
                if (!password_verify($current, $user['password_hash'])) {
                    throw new HttpException(401, 'Current password is incorrect.');
                }
                $user['password_hash'] = password_hash($next, PASSWORD_BCRYPT, ['cost' => 12]);
                return;
            }
            throw new HttpException(404, 'User not found.');
        });
        return ['ok' => true];
    }

    public static function users(Request $request): array
    {
        return array_map([Store::class, 'publicUser'], Store::all()['users']);
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

        $user = Store::mutate(function (array &$data) use ($username, $password, $role) {
            foreach ($data['users'] as $row) {
                if (strtolower((string) $row['username']) === $username) {
                    throw new HttpException(409, 'That username is already taken.');
                }
            }
            $user = [
                'id' => Store::nextId($data['users']),
                'username' => $username,
                'password_hash' => password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]),
                'role' => $role,
                'created_at' => Store::now(),
            ];
            $data['users'][] = $user;
            return Store::publicUser($user);
        });
        return Response::json($user, 201);
    }

    public static function deleteUser(Request $request): array
    {
        $id = (int) $request->params['id'];
        if ($id === (int) $request->user['id']) {
            throw new HttpException(400, 'You cannot delete your own account.');
        }
        $removed = Store::mutate(function (array &$data) use ($id) {
            $before = count($data['users']);
            $data['users'] = array_values(array_filter(
                $data['users'],
                static fn (array $row) => (int) $row['id'] !== $id
            ));
            return count($data['users']) < $before;
        });
        if (!$removed) {
            throw new HttpException(404, 'User not found.');
        }
        return ['ok' => true];
    }
}
