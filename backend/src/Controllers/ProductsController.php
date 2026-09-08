<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Http\HttpException;
use App\Http\Request;
use App\Http\Response;
use App\Support\ProductTypes;
use App\Support\Store;

class ProductsController
{
    private const STATUSES = ['active', 'inactive'];

    public static function list(Request $request): array
    {
        $search = strtolower(trim((string) ($request->query['search'] ?? '')));
        $category = trim((string) ($request->query['category'] ?? ''));
        $status = trim((string) ($request->query['status'] ?? ''));

        $rows = array_map([Store::class, 'withLowStock'], Store::all()['products'] ?? []);
        $rows = array_values(array_filter($rows, static function (array $row) use ($search, $category, $status) {
            if ($search !== '') {
                $haystack = strtolower(($row['name'] ?? '') . ' ' . ($row['variant'] ?? ''));
                if (!str_contains($haystack, $search)) {
                    return false;
                }
            }
            if ($category !== '' && ($row['category'] ?? '') !== $category) {
                return false;
            }
            if ($status !== '' && ($row['status'] ?? '') !== $status) {
                return false;
            }
            return true;
        }));
        usort($rows, static fn (array $a, array $b) => strcasecmp((string) $a['name'], (string) $b['name']));
        return $rows;
    }

    public static function show(Request $request): array
    {
        $row = self::byId($request->params['id']);
        if (!$row) {
            throw new HttpException(404, 'Product not found.');
        }
        return $row;
    }

    public static function create(Request $request): Response
    {
        $data = self::parse($request->body);
        $row = Store::mutate(function (array &$store) use ($data) {
            $row = $data + [
                'id' => Store::nextId($store['products']),
                'created_at' => Store::now(),
                'updated_at' => Store::now(),
            ];
            $store['products'][] = $row;
            return Store::withLowStock($row);
        });
        return Response::json($row, 201);
    }

    public static function update(Request $request): array
    {
        $data = self::parse($request->body);
        $row = Store::mutate(function (array &$store) use ($request, $data) {
            foreach ($store['products'] as &$product) {
                if ((int) $product['id'] !== (int) $request->params['id']) {
                    continue;
                }
                $product = array_merge($product, $data, ['updated_at' => Store::now()]);
                return Store::withLowStock($product);
            }
            return null;
        });
        if (!$row) {
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
        $row = Store::mutate(function (array &$store) use ($request, $delta) {
            foreach ($store['products'] as &$product) {
                if ((int) $product['id'] !== (int) $request->params['id']) {
                    continue;
                }
                $next = (int) $product['stock_quantity'] + $delta;
                if ($next < 0) {
                    return null;
                }
                $product['stock_quantity'] = $next;
                $product['updated_at'] = Store::now();
                return Store::withLowStock($product);
            }
            return null;
        });
        if (!$row) {
            throw new HttpException(400, 'Stock cannot go below zero, or the product was not found.');
        }
        return $row;
    }

    public static function delete(Request $request): array
    {
        $id = (int) $request->params['id'];
        $removed = Store::mutate(function (array &$store) use ($id) {
            $before = count($store['products']);
            $store['products'] = array_values(array_filter(
                $store['products'],
                static fn (array $row) => (int) $row['id'] !== $id
            ));
            foreach ($store['sales'] as &$sale) {
                foreach ($sale['items'] as &$item) {
                    if ((int) ($item['product_id'] ?? 0) === $id) {
                        $item['product_id'] = null;
                    }
                }
            }
            return count($store['products']) < $before;
        });
        if (!$removed) {
            throw new HttpException(404, 'Product not found.');
        }
        return ['ok' => true];
    }

    private static function byId(int|string $id): ?array
    {
        foreach (Store::all()['products'] as $row) {
            if ((int) $row['id'] === (int) $id) {
                return Store::withLowStock($row);
            }
        }
        return null;
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
