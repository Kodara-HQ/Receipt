<?php

declare(strict_types=1);

namespace App\Http;

use App\Support\Jwt;

class Router
{
    /** @var list<array{method:string,pattern:string,handler:callable,auth:bool,admin:bool}> */
    private array $routes = [];

    public function add(
        string $method,
        string $pattern,
        callable $handler,
        bool $auth = true,
        bool $admin = false
    ): void {
        $this->routes[] = [
            'method' => strtoupper($method),
            'pattern' => $pattern,
            'handler' => $handler,
            'auth' => $auth,
            'admin' => $admin,
        ];
    }

    public function dispatch(Request $request): Response
    {
        foreach ($this->routes as $route) {
            if ($route['method'] !== $request->method) {
                continue;
            }
            $params = $this->match($route['pattern'], $request->path);
            if ($params === null) {
                continue;
            }
            $request->params = $params;
            if ($route['auth'] || $route['admin']) {
                $this->authenticate($request, $route['admin']);
            }
            $result = ($route['handler'])($request);
            if ($result instanceof Response) {
                return $result;
            }
            return Response::json($result);
        }

        throw new HttpException(404, 'Not found.');
    }

    private function match(string $pattern, string $path): ?array
    {
        $regex = preg_replace('#\{([a-zA-Z_][a-zA-Z0-9_]*)\}#', '(?P<$1>[^/]+)', $pattern);
        $regex = '#^' . $regex . '$#';
        if (!preg_match($regex, $path, $matches)) {
            return null;
        }
        $params = [];
        foreach ($matches as $key => $value) {
            if (is_string($key)) {
                $params[$key] = $value;
            }
        }
        return $params;
    }

    private function authenticate(Request $request, bool $admin): void
    {
        $token = $request->bearerToken();
        if (!$token) {
            throw new HttpException(401, 'Please log in to continue.');
        }
        try {
            $request->user = Jwt::decode($token);
        } catch (\Throwable) {
            throw new HttpException(401, 'Session expired. Please log in again.');
        }
        if ($admin && ($request->user['role'] ?? '') !== 'admin') {
            throw new HttpException(403, 'Admin access required.');
        }
    }
}
