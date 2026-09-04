<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Http\HttpException;
use App\Http\Request;
use App\Http\Response;
use App\Support\Database;
use App\Support\ProductTypes;

class ProductsController
{
    private const STATUSES = ['active', 'inactive'];

    public static function list(Request $request): array
    {
        $search = trim((string) ($request->query['search'] ?? ''));
        $category = trim((string) ($request->query['category'] ?? ''));
        $status = trim((string) ($request->query['status'] ?? ''));
        $params = [];
        $where = [];

        if ($search !== '') {
            $params[] = '%' . strtolower($search) . '%';
            $where[] = '(LOWER(name) LIKE ? OR LOWER(COALESCE(variant, \'\')) LIKE ?)';
            $params[] = '%' . strtolower($search) . '%';
        }
        if ($category !== '' && in_array($category, ProductTypes::ALL, true)) {
            $params[] = $category;
            $where[] = 'category = ?';
        }
        if ($status !== '' && in_array($status, self::STATUSES, true)) {
            $params[] = $status;
            $where[] = 'status = ?';
        }

        $sql = 'SELECT *, (stock_quantity <= low_stock_threshold) AS is_low_stock FROM products';
        if ($where) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY name ASC';
        return Database::instance()->query($sql, $params);
    }

    public static function show(Request $request): array
    {
        $row = Database::instance()->queryOne(
            'SELECT *, (stock_quantity <= low_stock_threshold) AS is_low_stock FROM products WHERE id = ?',
            [$request->params['id']]
        );
        if (!$row) {
            throw new HttpException(404, 'Product not found.');
        }
        return $row;
    }

    public static function create(Request $request): Response
    {
        $data = self::parse($request->body);
        $db = Database::instance();
        $db->execute(
            'INSERT INTO products
                (name, category, variant, selling_price, cost_price, stock_quantity, low_stock_threshold, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $data['name'],
                $data['category'],
                $data['variant'],
                $data['selling_price'],
                $data['cost_price'],
                $data['stock_quantity'],
                $data['low_stock_threshold'],
                $data['status'],
            ]
        );
        $row = self::byId($db->lastId());
        return Response::json($row, 201);
    }

    public static function update(Request $request): array
    {
        $data = self::parse($request->body);
        $count = Database::instance()->execute(
            'UPDATE products SET
                name = ?, category = ?, variant = ?, selling_price = ?, cost_price = ?,
                stock_quantity = ?, low_stock_threshold = ?, status = ?, updated_at = NOW()
             WHERE id = ?',
            [
                $data['name'],
                $data['category'],
                $data['variant'],
                $data['selling_price'],
                $data['cost_price'],
                $data['stock_quantity'],
                $data['low_stock_threshold'],
                $data['status'],
                $request->params['id'],
            ]
        );
        $row = self::byId($request->params['id']);
        if ($count === 0 && !$row) {
            throw new HttpException(404, 'Product not found.');
        }
        return $row;
    }

    public static function adjustStock(Request $request): array
    {
        $delta = $request->body['delta'] ?? null;
        if (!is_numeric($delta) || (int) $delta != $delta || (int) $delta === 0) {
            throw new HttpException(400, 'Provide a whole-number stock change.');
        }
        $delta = (int) $delta;
        $count = Database::instance()->execute(
            'UPDATE products
             SET stock_quantity = stock_quantity + ?, updated_at = NOW()
             WHERE id = ? AND stock_quantity + ? >= 0',
            [$delta, $request->params['id'], $delta]
        );
        $row = $count ? self::byId($request->params['id']) : null;
        if (!$row) {
            throw new HttpException(400, 'Stock cannot go below zero, or the product was not found.');
        }
        return $row;
    }

    public static function delete(Request $request): array
    {
        $db = Database::instance();
        $db->execute('UPDATE sale_items SET product_id = NULL WHERE product_id = ?', [$request->params['id']]);
        $count = $db->execute('DELETE FROM products WHERE id = ?', [$request->params['id']]);
        if ($count === 0) {
            throw new HttpException(404, 'Product not found.');
        }
        return ['ok' => true];
    }

    private static function byId(int|string $id): ?array
    {
        return Database::instance()->queryOne(
            'SELECT *, (stock_quantity <= low_stock_threshold) AS is_low_stock FROM products WHERE id = ?',
            [$id]
        );
    }

    private static function parse(array $body, bool $partial = false): array
    {
        $data = [];
        if (!$partial || array_key_exists('name', $body)) {
            $name = trim((string) ($body['name'] ?? ''));
            if ($name === '') {
                throw new HttpException(400, 'Product name is required.');
            }
            $data['name'] = $name;
        }
        if (!$partial || array_key_exists('category', $body)) {
            if (!in_array($body['category'] ?? '', ProductTypes::ALL, true)) {
                throw new HttpException(400, 'Category must be one of: ' . implode(', ', ProductTypes::ALL) . '.');
            }
            $data['category'] = $body['category'];
        }
        if (!$partial || array_key_exists('variant', $body)) {
            $data['variant'] = trim((string) ($body['variant'] ?? ''));
        }
        if (!$partial || array_key_exists('selling_price', $body)) {
            $price = $body['selling_price'] ?? null;
            if (!is_numeric($price) || (float) $price < 0) {
                throw new HttpException(400, 'Selling price must be a number of 0 or more.');
            }
            $data['selling_price'] = (float) $price;
        }
        if (!$partial || array_key_exists('cost_price', $body)) {
            if ($body['cost_price'] === '' || $body['cost_price'] === null || !array_key_exists('cost_price', $body)) {
                $data['cost_price'] = null;
            } else {
                if (!is_numeric($body['cost_price']) || (float) $body['cost_price'] < 0) {
                    throw new HttpException(400, 'Cost price must be a number of 0 or more.');
                }
                $data['cost_price'] = (float) $body['cost_price'];
            }
        }
        if (!$partial || array_key_exists('stock_quantity', $body)) {
            $stock = $body['stock_quantity'] ?? null;
            if (!is_numeric($stock) || (int) $stock != $stock || (int) $stock < 0) {
                throw new HttpException(400, 'Stock quantity must be a whole number of 0 or more.');
            }
            $data['stock_quantity'] = (int) $stock;
        }
        if (!$partial || array_key_exists('low_stock_threshold', $body)) {
            $threshold = $body['low_stock_threshold'] ?? 5;
            if (!is_numeric($threshold) || (int) $threshold != $threshold || (int) $threshold < 0) {
                throw new HttpException(400, 'Low stock threshold must be a whole number of 0 or more.');
            }
            $data['low_stock_threshold'] = (int) $threshold;
        }
        if (!$partial || array_key_exists('status', $body)) {
            $status = $body['status'] ?? 'active';
            if (!in_array($status, self::STATUSES, true)) {
                throw new HttpException(400, 'Status must be active or inactive.');
            }
            $data['status'] = $status;
        }
        return $data;
    }
}
