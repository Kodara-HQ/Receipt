<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Http\HttpException;
use App\Http\Request;
use App\Support\Database;
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

        Database::instance()->execute(
            'UPDATE company_settings SET
                company_name = ?,
                address = ?,
                phone = ?,
                email = ?,
                receipt_footer = ?,
                signature_enabled = ?,
                currency = ?,
                receipt_paper_size = ?,
                show_customer_info = ?,
                show_cashier_name = ?,
                default_cashier = ?,
                updated_at = NOW()
             WHERE id = 1',
            [
                $companyName,
                (string) ($request->body['address'] ?? $current['address'] ?? ''),
                (string) ($request->body['phone'] ?? $current['phone'] ?? ''),
                (string) ($request->body['email'] ?? $current['email'] ?? ''),
                (string) ($request->body['receipt_footer'] ?? $current['receipt_footer'] ?? ''),
                self::bool($request->body['signature_enabled'] ?? $current['signature_enabled']) ? 1 : 0,
                $currency,
                $paperSize,
                self::bool($request->body['show_customer_info'] ?? $current['show_customer_info']) ? 1 : 0,
                self::bool($request->body['show_cashier_name'] ?? $current['show_cashier_name']) ? 1 : 0,
                (string) ($request->body['default_cashier'] ?? $current['default_cashier'] ?? ''),
            ]
        );
        return self::current();
    }

    public static function uploadLogo(Request $request): array
    {
        $current = self::current();
        $nextPath = Uploads::saveUploaded('logo');
        if (!empty($current['logo']) && $current['logo'] !== $nextPath) {
            Uploads::remove($current['logo']);
        }
        Database::instance()->execute(
            'UPDATE company_settings SET logo = ?, updated_at = NOW() WHERE id = 1',
            [$nextPath]
        );
        return self::current();
    }

    public static function deleteLogo(Request $request): array
    {
        $current = self::current();
        if (!empty($current['logo'])) {
            Uploads::remove($current['logo']);
        }
        Database::instance()->execute(
            'UPDATE company_settings SET logo = NULL, updated_at = NOW() WHERE id = 1'
        );
        return self::current();
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

        Database::instance()->execute(
            'UPDATE company_settings
             SET signature = ?, signature_enabled = 1, updated_at = NOW()
             WHERE id = 1',
            [$nextPath]
        );
        return self::current();
    }

    public static function deleteSignature(Request $request): array
    {
        $current = self::current();
        if (!empty($current['signature'])) {
            Uploads::remove($current['signature']);
        }
        Database::instance()->execute(
            'UPDATE company_settings SET signature = NULL, updated_at = NOW() WHERE id = 1'
        );
        return self::current();
    }

    private static function current(): array
    {
        $row = Database::instance()->queryOne('SELECT * FROM company_settings WHERE id = 1');
        if (!$row) {
            throw new HttpException(500, 'Company settings are missing.');
        }
        return $row;
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
