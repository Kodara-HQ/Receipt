<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Http\HttpException;
use App\Http\Request;
use App\Http\Response;
use App\Support\Database;
use App\Support\ProductTypes;
use App\Support\ReceiptNumber;

class SalesController
{
    private const PAYMENTS = ['Cash', 'Mobile Money', 'Card', 'Other'];

    public static function list(Request $request): array
    {
        $search = trim((string) ($request->query['search'] ?? ''));
        $paymentMethod = trim((string) ($request->query['payment_method'] ?? ''));
        $from = trim((string) ($request->query['from'] ?? ''));
        $to = trim((string) ($request->query['to'] ?? ''));
        $params = [];
        $where = [];

        if ($search !== '') {
            $like = '%' . strtolower($search) . '%';
            $params[] = $like;
            $params[] = $like;
            $where[] = '(LOWER(receipt_number) LIKE ? OR LOWER(COALESCE(customer_name, \'\')) LIKE ?)';
        }
        if ($paymentMethod !== '' && in_array($paymentMethod, self::PAYMENTS, true)) {
            $params[] = $paymentMethod;
            $where[] = 'payment_method = ?';
        }
        if ($from !== '') {
            $params[] = $from;
            $where[] = 'DATE(created_at) >= ?';
        }
        if ($to !== '') {
            $params[] = $to;
            $where[] = 'DATE(created_at) <= ?';
        }

        $sql = 'SELECT * FROM sales';
        if ($where) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY created_at DESC LIMIT 300';
        return Database::instance()->query($sql, $params);
    }

    public static function show(Request $request): array
    {
        $db = Database::instance();
        $sale = $db->queryOne('SELECT * FROM sales WHERE id = ?', [$request->params['id']]);
        if (!$sale) {
            throw new HttpException(404, 'Sale not found.');
        }
        $sale['items'] = $db->query(
            'SELECT * FROM sale_items WHERE sale_id = ? ORDER BY id ASC',
            [$request->params['id']]
        );
        return $sale;
    }

    public static function create(Request $request): Response
    {
        $items = $request->body['items'] ?? [];
        if (!is_array($items) || $items === []) {
            throw new HttpException(400, 'Add at least one product to the receipt.');
        }

        $discount = (float) ($request->body['discount'] ?? 0);
        if ($discount < 0) {
            throw new HttpException(400, 'Discount must be 0 or more.');
        }
        $amountPaid = $request->body['amount_paid'] ?? null;
        if (!is_numeric($amountPaid) || (float) $amountPaid < 0) {
            throw new HttpException(400, 'Amount paid must be 0 or more.');
        }
        $amountPaid = (float) $amountPaid;
        $paymentMethod = $request->body['payment_method'] ?? '';
        if (!in_array($paymentMethod, self::PAYMENTS, true)) {
            throw new HttpException(400, 'Choose a valid payment method.');
        }

        $customerName = trim((string) ($request->body['customer_name'] ?? '')) ?: null;
        $customerPhone = trim((string) ($request->body['customer_phone'] ?? '')) ?: '0541855747';
        $cashier = trim((string) ($request->body['cashier'] ?? '')) ?: null;

        $sale = Database::instance()->transaction(function (Database $db) use (
            $items,
            $discount,
            $amountPaid,
            $paymentMethod,
            $customerName,
            $customerPhone,
            $cashier
        ) {
            $subtotal = 0.0;
            $prepared = [];

            foreach ($items as $item) {
                $quantity = $item['quantity'] ?? null;
                if (!is_numeric($quantity) || (int) $quantity != $quantity || (int) $quantity <= 0) {
                    throw new HttpException(400, 'Each item needs a quantity of 1 or more.');
                }
                $quantity = (int) $quantity;
                $productId = isset($item['product_id']) && $item['product_id'] ? (int) $item['product_id'] : null;
                $name = trim((string) ($item['name'] ?? $item['product_name'] ?? ''));
                $productType = trim((string) ($item['product_type'] ?? $item['category'] ?? ''));
                $variant = trim((string) ($item['variant'] ?? ''));
                $unitPrice = array_key_exists('unit_price', $item) ? (float) $item['unit_price'] : NAN;

                if ($productId) {
                    $row = $db->queryOne('SELECT * FROM products WHERE id = ? FOR UPDATE', [$productId]);
                    if (!$row) {
                        throw new HttpException(400, 'One of the selected products was not found.');
                    }
                    if ($row['status'] !== 'active') {
                        throw new HttpException(400, $row['name'] . ' is not available for sale.');
                    }
                    if ((int) $row['stock_quantity'] < $quantity) {
                        throw new HttpException(
                            400,
                            'Not enough stock for ' . $row['name'] . '. Only ' . $row['stock_quantity'] . ' left.'
                        );
                    }
                    $name = $name !== '' ? $name : $row['name'];
                    $productType = $productType !== '' ? $productType : $row['category'];
                    $variant = $variant !== '' ? $variant : (string) ($row['variant'] ?? '');
                    if (is_nan($unitPrice)) {
                        $unitPrice = (float) $row['selling_price'];
                    }
                    $db->execute(
                        'UPDATE products SET stock_quantity = stock_quantity - ?, updated_at = NOW() WHERE id = ?',
                        [$quantity, $productId]
                    );
                }

                if ($name === '') {
                    throw new HttpException(400, 'Each item needs a product name.');
                }
                if (!in_array($productType, ProductTypes::ALL, true)) {
                    throw new HttpException(400, 'Choose a product type: ' . implode(', ', ProductTypes::ALL) . '.');
                }
                if (is_nan($unitPrice) || $unitPrice < 0) {
                    throw new HttpException(400, 'Each item needs a unit price of 0 or more.');
                }

                $lineTotal = round($unitPrice * $quantity, 2);
                $subtotal += $lineTotal;
                $prepared[] = [
                    'product_id' => $productId,
                    'product_name' => $variant !== '' ? $name . ' (' . $variant . ')' : $name,
                    'product_type' => $productType,
                    'variant' => $variant,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'subtotal' => $lineTotal,
                ];
            }

            $subtotal = round($subtotal, 2);
            if ($discount > $subtotal) {
                throw new HttpException(400, 'Discount cannot be more than the subtotal.');
            }
            $total = round($subtotal - $discount, 2);
            if ($amountPaid < $total) {
                throw new HttpException(400, 'Amount paid must cover the grand total.');
            }
            $changeAmount = round($amountPaid - $total, 2);
            $receiptNumber = ReceiptNumber::next($db);

            $db->execute(
                'INSERT INTO sales (
                    receipt_number, customer_name, customer_phone, subtotal, discount, total,
                    amount_paid, change_amount, payment_method, cashier
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    $receiptNumber,
                    $customerName,
                    $customerPhone,
                    $subtotal,
                    $discount,
                    $total,
                    $amountPaid,
                    $changeAmount,
                    $paymentMethod,
                    $cashier,
                ]
            );
            $inserted = $db->queryOne('SELECT * FROM sales WHERE id = ?', [$db->lastId()]);

            $savedItems = [];
            foreach ($prepared as $item) {
                $db->execute(
                    'INSERT INTO sale_items
                        (sale_id, product_id, product_name, product_type, variant, quantity, unit_price, subtotal)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [
                        $inserted['id'],
                        $item['product_id'],
                        $item['product_name'],
                        $item['product_type'],
                        $item['variant'],
                        $item['quantity'],
                        $item['unit_price'],
                        $item['subtotal'],
                    ]
                );
                $savedItems[] = $db->queryOne('SELECT * FROM sale_items WHERE id = ?', [$db->lastId()]);
            }

            $inserted['items'] = $savedItems;
            return $inserted;
        });

        return Response::json($sale, 201);
    }

    public static function clear(Request $request): array
    {
        Database::instance()->transaction(function (Database $db) {
            $db->execute('DELETE FROM sale_items');
            $db->execute('DELETE FROM sales');
            $db->execute("UPDATE receipt_counter SET last_number = 0, last_date = '' WHERE id = 1");
        });
        return ['ok' => true];
    }

    public static function delete(Request $request): array
    {
        $count = Database::instance()->execute('DELETE FROM sales WHERE id = ?', [$request->params['id']]);
        if ($count === 0) {
            throw new HttpException(404, 'Receipt not found.');
        }
        return ['ok' => true];
    }
}
