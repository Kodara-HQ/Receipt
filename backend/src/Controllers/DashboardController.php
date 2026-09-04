<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Http\Request;
use App\Support\Database;

class DashboardController
{
    public static function show(Request $request): array
    {
        $db = Database::instance();
        $today = $db->queryOne("
            SELECT
              COALESCE(SUM(total), 0) AS amount,
              COUNT(*) AS transactions
            FROM sales
            WHERE DATE(created_at) = CURDATE()
        ");
        $month = $db->queryOne("
            SELECT COALESCE(SUM(total), 0) AS amount
            FROM sales
            WHERE YEAR(created_at) = YEAR(CURDATE())
              AND MONTH(created_at) = MONTH(CURDATE())
        ");
        $products = $db->queryOne("
            SELECT
              COUNT(*) AS total,
              SUM(CASE WHEN stock_quantity <= low_stock_threshold AND status = 'active' THEN 1 ELSE 0 END) AS low_stock
            FROM products
        ");
        $recent = $db->query("
            SELECT id, receipt_number, customer_name, total, payment_method, cashier, created_at
            FROM sales
            ORDER BY created_at DESC
            LIMIT 8
        ");
        $lowStock = $db->query("
            SELECT id, name, category, variant, stock_quantity, low_stock_threshold, selling_price
            FROM products
            WHERE stock_quantity <= low_stock_threshold AND status = 'active'
            ORDER BY stock_quantity ASC, name ASC
            LIMIT 10
        ");

        return [
            'today_sales' => (float) $today['amount'],
            'today_transactions' => (int) $today['transactions'],
            'month_sales' => (float) $month['amount'],
            'total_products' => (int) $products['total'],
            'low_stock_count' => (int) $products['low_stock'],
            'recent_sales' => $recent,
            'low_stock_products' => $lowStock,
        ];
    }
}
