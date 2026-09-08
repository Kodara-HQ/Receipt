<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Http\Request;
use App\Support\Store;

class DashboardController
{
    public static function show(Request $request): array
    {
        $data = Store::all();
        $today = date('Y-m-d');
        $month = date('Y-m');
        $todaySales = 0.0;
        $todayTransactions = 0;
        $monthSales = 0.0;
        $recent = [];

        $sales = $data['sales'] ?? [];
        usort($sales, static fn (array $a, array $b) => strcmp((string) $b['created_at'], (string) $a['created_at']));

        foreach ($sales as $sale) {
            $stamp = substr((string) ($sale['created_at'] ?? ''), 0, 10);
            $ym = substr((string) ($sale['created_at'] ?? ''), 0, 7);
            if ($stamp === $today) {
                $todaySales += (float) $sale['total'];
                $todayTransactions += 1;
            }
            if ($ym === $month) {
                $monthSales += (float) $sale['total'];
            }
        }

        $lowStock = [];
        foreach ($data['products'] as $product) {
            if (($product['status'] ?? '') === 'active'
                && (int) $product['stock_quantity'] <= (int) $product['low_stock_threshold']) {
                $lowStock[] = $product;
            }
        }
        usort($lowStock, static function (array $a, array $b) {
            $cmp = (int) $a['stock_quantity'] <=> (int) $b['stock_quantity'];
            return $cmp !== 0 ? $cmp : strcasecmp((string) $a['name'], (string) $b['name']);
        });

        foreach (array_slice($sales, 0, 8) as $sale) {
            $recent[] = [
                'id' => $sale['id'],
                'receipt_number' => $sale['receipt_number'],
                'customer_name' => $sale['customer_name'] ?? null,
                'total' => $sale['total'],
                'payment_method' => $sale['payment_method'],
                'cashier' => $sale['cashier'] ?? null,
                'created_at' => $sale['created_at'],
            ];
        }

        return [
            'today_sales' => $todaySales,
            'today_transactions' => $todayTransactions,
            'month_sales' => $monthSales,
            'total_products' => count($data['products']),
            'low_stock_count' => count($lowStock),
            'recent_sales' => $recent,
            'low_stock_products' => array_slice($lowStock, 0, 10),
        ];
    }
}
