<?php

declare(strict_types=1);

namespace App\Support;

use App\Http\HttpException;
use PDO;
use PDOException;

class Database
{
    private static ?self $instance = null;
    private PDO $pdo;

    private const BOOL_KEYS = [
        'signature_enabled',
        'show_customer_info',
        'show_cashier_name',
        'is_low_stock',
    ];

    private const INT_KEYS = [
        'id',
        'sale_id',
        'product_id',
        'quantity',
        'stock_quantity',
        'low_stock_threshold',
        'last_number',
        'today_transactions',
        'total_products',
        'low_stock_count',
        'transactions',
        'low_stock',
    ];

    private function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public static function config(): array
    {
        $url = (string) (getenv('DATABASE_URL') ?: '');
        if ($url !== '' && preg_match('#^(mysql|mariadb)://#i', $url)) {
            $parts = parse_url($url);
            if ($parts !== false && !empty($parts['host'])) {
                $name = ltrim($parts['path'] ?? '/fragrance_universe', '/');
                $name = explode('?', $name, 2)[0];
                return [
                    'host' => $parts['host'],
                    'port' => (string) ($parts['port'] ?? '3306'),
                    'name' => $name !== '' ? $name : 'fragrance_universe',
                    'user' => urldecode($parts['user'] ?? 'root'),
                    'pass' => urldecode($parts['pass'] ?? ''),
                ];
            }
        }

        return [
            'host' => getenv('DB_HOST') ?: '127.0.0.1',
            'port' => getenv('DB_PORT') ?: '3306',
            'name' => getenv('DB_NAME') ?: 'fragrance_universe',
            'user' => getenv('DB_USER') ?: 'root',
            'pass' => getenv('DB_PASSWORD') !== false && getenv('DB_PASSWORD') !== null
                ? (string) getenv('DB_PASSWORD')
                : '',
        ];
    }

    public static function instance(): self
    {
        if (self::$instance) {
            return self::$instance;
        }

        $config = self::config();
        $dsn = sprintf(
            'mysql:host=%s;port=%s;charset=utf8mb4',
            $config['host'],
            $config['port']
        );

        try {
            $pdo = new PDO($dsn, $config['user'], $config['pass'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::MYSQL_ATTR_MULTI_STATEMENTS => true,
            ]);
            $name = str_replace('`', '', $config['name']);
            $pdo->exec(
                "CREATE DATABASE IF NOT EXISTS `{$name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            );
            $pdo->exec("USE `{$name}`");
        } catch (PDOException $error) {
            throw new HttpException(
                503,
                'Could not connect to MySQL. Start MySQL in XAMPP, then open phpMyAdmin. ' . $error->getMessage()
            );
        }

        self::$instance = new self($pdo);
        return self::$instance;
    }

    public function pdo(): PDO
    {
        return $this->pdo;
    }

    public function lastId(): int
    {
        return (int) $this->pdo->lastInsertId();
    }

    public function query(string $sql, array $params = []): array
    {
        $statement = $this->pdo->prepare($sql);
        $statement->execute(array_values($params));
        $rows = $statement->fetchAll();
        return array_map([$this, 'normalize'], $rows);
    }

    public function queryOne(string $sql, array $params = []): ?array
    {
        return $this->query($sql, $params)[0] ?? null;
    }

    public function execute(string $sql, array $params = []): int
    {
        $statement = $this->pdo->prepare($sql);
        $statement->execute(array_values($params));
        return $statement->rowCount();
    }

    public function transaction(callable $work): mixed
    {
        $this->pdo->beginTransaction();
        try {
            $result = $work($this);
            $this->pdo->commit();
            return $result;
        } catch (\Throwable $error) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $error;
        }
    }

    private function normalize(array $row): array
    {
        foreach ($row as $key => $value) {
            if ($value === null) {
                continue;
            }
            if (in_array($key, self::BOOL_KEYS, true)) {
                $row[$key] = in_array($value, [true, 1, '1', 't', 'true'], true);
            }
            if (in_array($key, self::INT_KEYS, true) && is_numeric($value)) {
                $row[$key] = (int) $value;
            }
        }
        return $row;
    }
}
