<?php

declare(strict_types=1);

namespace App\Support;

class Jwt
{
    public static function secret(): string
    {
        return getenv('JWT_SECRET') ?: 'fragrance_universe_jwt_secret';
    }

    public static function encode(array $payload, int $ttlSeconds = 43200): string
    {
        $header = self::b64url(json_encode(['typ' => 'JWT', 'alg' => 'HS256'], JSON_UNESCAPED_SLASHES));
        $payload['iat'] = time();
        $payload['exp'] = time() + $ttlSeconds;
        $body = self::b64url(json_encode($payload, JSON_UNESCAPED_SLASHES));
        $signature = self::b64url(hash_hmac('sha256', $header . '.' . $body, self::secret(), true));
        return $header . '.' . $body . '.' . $signature;
    }

    public static function decode(string $token): array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            throw new \RuntimeException('Invalid token.');
        }
        [$header, $body, $signature] = $parts;
        $expected = self::b64url(hash_hmac('sha256', $header . '.' . $body, self::secret(), true));
        if (!hash_equals($expected, $signature)) {
            throw new \RuntimeException('Invalid token.');
        }
        $payload = json_decode(self::unb64url($body), true);
        if (!is_array($payload)) {
            throw new \RuntimeException('Invalid token.');
        }
        if (($payload['exp'] ?? 0) < time()) {
            throw new \RuntimeException('Expired token.');
        }
        return $payload;
    }

    private static function b64url(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function unb64url(string $data): string
    {
        $remainder = strlen($data) % 4;
        if ($remainder) {
            $data .= str_repeat('=', 4 - $remainder);
        }
        return base64_decode(strtr($data, '-_', '+/')) ?: '';
    }
}
