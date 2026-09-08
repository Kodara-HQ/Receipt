<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Http\HttpException;
use App\Http\Request;
use App\Support\Store;
use App\Support\Uploads;

class SettingsController
{
    private const PAPER = ['thermal', 'a4'];

    public static function show(Request $request): array
    {
        return self::current();
    }

    public static function update(Request $request): array
    {
        $current = self::current();
        $companyName = trim((string) ($request->body['company_name'] ?? $current['company_name']));
        if ($companyName === '') {
            throw new HttpException(400, 'Company name is required.');
        }
        $paperSize = $request->body['receipt_paper_size'] ?? $current['receipt_paper_size'];
        if (!in_array($paperSize, self::PAPER, true)) {
            throw new HttpException(400, 'Receipt paper size must be thermal or A4.');
        }
        $currency = trim((string) ($request->body['currency'] ?? $current['currency'])) ?: 'GH₵';

        return Store::mutate(function (array &$store) use ($request, $current, $companyName, $paperSize, $currency) {
            $store['settings'] = array_merge($current, [
                'company_name' => $companyName,
                'address' => (string) ($request->body['address'] ?? $current['address'] ?? ''),
                'phone' => (string) ($request->body['phone'] ?? $current['phone'] ?? ''),
                'email' => (string) ($request->body['email'] ?? $current['email'] ?? ''),
                'receipt_footer' => (string) ($request->body['receipt_footer'] ?? $current['receipt_footer'] ?? ''),
                'logo' => $current['logo'] ?? null,
                'signature' => $current['signature'] ?? null,
                'signature_enabled' => self::bool($request->body['signature_enabled'] ?? $current['signature_enabled']),
                'currency' => $currency,
                'receipt_paper_size' => $paperSize,
                'show_customer_info' => self::bool($request->body['show_customer_info'] ?? $current['show_customer_info']),
                'show_cashier_name' => self::bool($request->body['show_cashier_name'] ?? $current['show_cashier_name']),
                'default_cashier' => (string) ($request->body['default_cashier'] ?? $current['default_cashier'] ?? ''),
                'updated_at' => Store::now(),
            ]);
            return $store['settings'];
        });
    }

    public static function uploadLogo(Request $request): array
    {
        $current = self::current();
        $nextPath = Uploads::saveUploaded('logo');
        if (!empty($current['logo']) && $current['logo'] !== $nextPath) {
            Uploads::remove($current['logo']);
        }
        return self::patch(['logo' => $nextPath]);
    }

    public static function deleteLogo(Request $request): array
    {
        $current = self::current();
        if (!empty($current['logo'])) {
            Uploads::remove($current['logo']);
        }
        return self::patch(['logo' => null]);
    }

    public static function uploadSignature(Request $request): array
    {
        $current = self::current();
        if (!empty($_FILES['file']['tmp_name'])) {
            $nextPath = Uploads::saveUploaded('signature');
        } elseif (!empty($request->body['data_url'])) {
            $nextPath = Uploads::saveDataUrl((string) $request->body['data_url'], 'signature');
        } else {
            throw new HttpException(400, 'Upload a signature image or save a drawn signature.');
        }
        if (!empty($current['signature']) && $current['signature'] !== $nextPath) {
            Uploads::remove($current['signature']);
        }
        return self::patch(['signature' => $nextPath, 'signature_enabled' => true]);
    }

    public static function deleteSignature(Request $request): array
    {
        $current = self::current();
        if (!empty($current['signature'])) {
            Uploads::remove($current['signature']);
        }
        return self::patch(['signature' => null, 'signature_enabled' => false]);
    }

    private static function current(): array
    {
        $row = Store::all()['settings'] ?? null;
        if (!$row) {
            throw new HttpException(500, 'Company settings are missing.');
        }
        return $row;
    }

    private static function patch(array $changes): array
    {
        return Store::mutate(function (array &$store) use ($changes) {
            $store['settings'] = array_merge($store['settings'], $changes, ['updated_at' => Store::now()]);
            return $store['settings'];
        });
    }

    private static function bool(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }
        if (is_string($value)) {
            return in_array(strtolower($value), ['1', 'true', 't', 'yes', 'on'], true);
        }
        return (bool) $value;
    }
}
