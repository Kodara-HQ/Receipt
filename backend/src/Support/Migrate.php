<?php

declare(strict_types=1);

namespace App\Support;

class Migrate
{
    private static bool $done = false;

    public static function ensure(): void
    {
        if (self::$done) {
            return;
        }

        $db = Database::instance();
        self::runFile($db->pdo(), dirname(__DIR__, 2) . '/schema.sql');

        $db->execute(
            "UPDATE sales SET customer_phone = '0541855747'
             WHERE customer_phone IS NULL OR TRIM(customer_phone) = ''"
        );

        $users = $db->queryOne('SELECT COUNT(*) AS count FROM users');
        if ((int) $users['count'] === 0) {
            $hash = password_hash('admin1234', PASSWORD_BCRYPT, ['cost' => 12]);
            $db->execute(
                'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
                ['admin', $hash, 'admin']
            );
        }

        $products = $db->queryOne('SELECT COUNT(*) AS count FROM products');
        if ((int) $products['count'] === 0) {
            $type = 'All Kinds of fragrance (Room, Laundry, Wardrobes, Car, Body etc)';
            foreach (['Ikeda b/s', 'Ikeda s/s'] as $name) {
                $db->execute(
                    "INSERT INTO products
                        (name, category, variant, selling_price, cost_price, stock_quantity, low_stock_threshold)
                     VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [$name, $type, '12pcs per pack', 0, null, 100, 10]
                );
            }
        }

        self::$done = true;
    }

    private static function runFile(\PDO $pdo, string $path): void
    {
        $sql = file_get_contents($path) ?: '';
        $sql = preg_replace('/^\s*--.*$/m', '', $sql);
        foreach (array_filter(array_map('trim', explode(';', $sql))) as $statement) {
            if ($statement !== '') {
                $pdo->exec($statement);
            }
        }
    }
}
