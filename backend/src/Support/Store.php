<?php

declare(strict_types=1);

namespace App\Support;

class Store
{
    private static bool $ready = false;

    public static function directory(): string
    {
        $bundled = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'data';
        if (getenv('DATA_DIR')) {
            return rtrim((string) getenv('DATA_DIR'), '/\\');
        }
        if (getenv('VERCEL')) {
            return sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'fragrance-data';
        }
        return $bundled;
    }

    public static function file(): string
    {
        return self::directory() . DIRECTORY_SEPARATOR . 'store.json';
    }

    public static function ensure(): void
    {
        if (self::$ready) {
            return;
        }
        $dir = self::directory();
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        if (!is_file(self::file())) {
            self::save(self::defaults());
        }
        self::$ready = true;
    }

    public static function all(): array
    {
        self::ensure();
        $raw = file_get_contents(self::file());
        $data = json_decode($raw ?: '', true);
        if (!is_array($data)) {
            $data = self::defaults();
            self::save($data);
        }
        return self::withKeys($data);
    }

    public static function mutate(callable $work): mixed
    {
        self::ensure();
        $handle = fopen(self::file(), 'c+');
        if (!$handle) {
            throw new \RuntimeException('Could not open the data file.');
        }
        flock($handle, LOCK_EX);
        try {
            rewind($handle);
            $raw = stream_get_contents($handle);
            $data = json_decode($raw ?: '', true);
            if (!is_array($data)) {
                $data = self::defaults();
            }
            $data = self::withKeys($data);
            $result = $work($data);
            rewind($handle);
            ftruncate($handle, 0);
            fwrite($handle, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            fflush($handle);
            return $result;
        } finally {
            flock($handle, LOCK_UN);
            fclose($handle);
        }
    }

    public static function nextId(array $rows): int
    {
        $max = 0;
        foreach ($rows as $row) {
            $max = max($max, (int) ($row['id'] ?? 0));
        }
        return $max + 1;
    }

    public static function now(): string
    {
        return date('c');
    }

    public static function publicUser(array $user): array
    {
        return [
            'id' => (int) $user['id'],
            'username' => $user['username'],
            'role' => $user['role'],
            'created_at' => $user['created_at'] ?? self::now(),
        ];
    }

    public static function withLowStock(array $product): array
    {
        $product['is_low_stock'] = ((int) $product['stock_quantity']) <= ((int) $product['low_stock_threshold']);
        return $product;
    }

    private static function withKeys(array $data): array
    {
        if (!isset($data['products']) || !is_array($data['products'])) {
            $data['products'] = [];
        }
        if (!isset($data['sales']) || !is_array($data['sales'])) {
            $data['sales'] = [];
        }
        if (!isset($data['counter']) || !is_array($data['counter'])) {
            $data['counter'] = ['last_number' => 0, 'last_date' => ''];
        }
        if (!isset($data['users']) || !is_array($data['users'])) {
            $data['users'] = self::defaults()['users'];
        }
        if (!isset($data['settings']) || !is_array($data['settings'])) {
            $data['settings'] = self::defaults()['settings'];
        }
        return $data;
    }

    private static function starterProducts(): array
    {
        $now = self::now();
        $fragrance = 'All Kinds of fragrance (Room, Laundry, Wardrobes, Car, Body etc)';
        $rows = [
            ['Ikeda b/s', $fragrance, '12pcs per pack', 1020],
            ['Ikeda s/s', $fragrance, '12pcs per pack', 840],
            ['Aer Power Pocket', 'Air Freshener', '6pcs per pack', 55],
        ];
        $products = [];
        foreach ($rows as $index => $row) {
            $products[] = [
                'id' => $index + 1,
                'name' => $row[0],
                'category' => $row[1],
                'variant' => $row[2],
                'selling_price' => $row[3],
                'cost_price' => null,
                'stock_quantity' => 100,
                'low_stock_threshold' => 5,
                'status' => 'active',
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }
        return $products;
    }

    private static function save(array $data): void
    {
        file_put_contents(
            self::file(),
            json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
        );
    }

    private static function defaults(): array
    {
        return [
            'users' => [
                [
                    'id' => 1,
                    'username' => 'admin',
                    'password_hash' => password_hash('admin1234', PASSWORD_BCRYPT, ['cost' => 12]),
                    'role' => 'admin',
                    'created_at' => self::now(),
                ],
            ],
            'products' => self::starterProducts(),
            'sales' => [],
            'settings' => [
                'id' => 1,
                'company_name' => 'EVERY FRAGRANCE',
                'address' => 'Cape Coast- Ghana',
                'phone' => '0543353908',
                'email' => 'info@thefragranceuniverse.org',
                'logo' => '/uploads/logo-1788884315218.png',
                'receipt_footer' => 'Thank you for shopping with Every Fragrance. We look forward to serving you again',
                'signature' => '/uploads/signature-1788885493656.png',
                'signature_enabled' => true,
                'currency' => 'GH₵',
                'receipt_paper_size' => 'thermal',
                'show_customer_info' => true,
                'show_cashier_name' => true,
                'default_cashier' => 'Daniella Delali',
                'created_at' => self::now(),
                'updated_at' => self::now(),
            ],
            'counter' => [
                'last_number' => 0,
                'last_date' => '',
            ],
        ];
    }
}
