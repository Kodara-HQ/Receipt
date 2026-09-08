<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Http\HttpException;
use App\Http\Request;
use App\Http\Response;
use App\Support\ProductTypes;
use App\Support\ReceiptNumber;
use App\Support\Store;

class SalesController
{
    private const PAYMENTS = ['Cash', 'Mobile Money', 'Card', 'Other'];

    public static function list(Request $request): array
    {
        $search = strtolower(trim((string) ($request->query['search'] ?? '')));
        $paymentMethod = trim((string) ($request->query['payment_method'] ?? ''));
        $from = trim((string) ($request->query['from'] ?? ''));
        $to = trim((string) ($request->query['to'] ?? ''));

        $rows = Store::all()['sales'] ?? [];
        $rows = array_values(array_filter($rows, static function (array $sale) use ($search, $paymentMethod, $from, $to) {
            if ($search !== '') {
                $haystack = strtolower(($sale['receipt_number'] ?? '') . ' ' . ($sale['customer_name'] ?? ''));
                if (!str_contains($haystack, $search)) {
                    return false;
                }
            }
            if ($paymentMethod !== '' && ($sale['payment_method'] ?? '') !== $paymentMethod) {
                return false;
            }
            $day = substr((string) ($sale['created_at'] ?? ''), 0, 10);
            if ($from !== '' && $day < $from) {
                return false;
            }
            if ($to !== '' && $day > $to) {
                return false;
            }
            return true;
        }));
        usort($rows, static fn (array $a, array $b) => strcmp((string) $b['created_at'], (string) $a['created_at']));
        return array_slice(array_map(static function (array $sale) {
            unset($sale['items']);
            return $sale;
        }, $rows), 0, 300);
    }

    public static function show(Request $request): array
    {
        foreach (Store::all()['sales'] as $sale) {
            if ((int) $sale['id'] === (int) $request->params['id']) {
                return $sale;
            }
        }
        throw new HttpException(404, 'Sale not found.');
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
        $customerPhone = trim((string) ($request->body['customer_phone'] ?? '')) ?: null;
        $cashier = trim((string) ($request->body['cashier'] ?? '')) ?: null;

        $sale = Store::mutate(function (array &$store) use (
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

                if (!$productId && $name !== '') {
                    foreach ($store['products'] as $candidate) {
                        if (strcasecmp((string) $candidate['name'], $name) !== 0) {
                            continue;
                        }
                        $rowVariant = (string) ($candidate['variant'] ?? '');
                        if ($variant !== '' && strcasecmp($rowVariant, $variant) !== 0) {
                            continue;
                        }
                        $productId = (int) $candidate['id'];
                        break;
                    }
                }

                if ($productId) {
                    $found = false;
                    foreach ($store['products'] as &$row) {
                        if ((int) $row['id'] !== $productId) {
                            continue;
                        }
                        $found = true;
                        if (($row['status'] ?? 'active') !== 'active') {
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
                        $row['stock_quantity'] = (int) $row['stock_quantity'] - $quantity;
                        $row['updated_at'] = Store::now();
                        break;
                    }
                    unset($row);
                    if (!$found) {
                        throw new HttpException(400, 'One of the selected products was not found.');
                    }
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

            $saleId = Store::nextId($store['sales']);
            $savedItems = [];
            $itemId = 1;
            foreach ($prepared as $item) {
                $item['id'] = $itemId;
                $item['sale_id'] = $saleId;
                $savedItems[] = $item;
                $itemId += 1;
            }

            $inserted = [
                'id' => $saleId,
                'receipt_number' => ReceiptNumber::next($store),
                'customer_name' => $customerName,
                'customer_phone' => $customerPhone,
                'subtotal' => $subtotal,
                'discount' => $discount,
                'total' => $total,
                'amount_paid' => $amountPaid,
                'change_amount' => round($amountPaid - $total, 2),
                'payment_method' => $paymentMethod,
                'cashier' => $cashier,
                'created_at' => Store::now(),
                'items' => $savedItems,
            ];
            $store['sales'][] = $inserted;
            return $inserted;
        });

        return Response::json($sale, 201);
    }

    public static function clear(Request $request): array
    {
        Store::mutate(function (array &$store) {
            $store['sales'] = [];
            $store['counter'] = ['last_number' => 0, 'last_date' => ''];
        });
        return ['ok' => true];
    }

    public static function delete(Request $request): array
    {
        $id = (int) $request->params['id'];
        $removed = Store::mutate(function (array &$store) use ($id) {
            $before = count($store['sales']);
            $store['sales'] = array_values(array_filter(
                $store['sales'],
                static fn (array $row) => (int) $row['id'] !== $id
            ));
            return count($store['sales']) < $before;
        });
        if (!$removed) {
            throw new HttpException(404, 'Receipt not found.');
        }
        return ['ok' => true];
    }
}
