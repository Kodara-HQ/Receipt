<?php

declare(strict_types=1);

namespace App\Support;

use App\Http\HttpException;

class Uploads
{
    public static function directory(): string
    {
        $local = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'uploads';
        if (getenv('VERCEL')) {
            return sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'fragrance-uploads';
        }
        return $local;
    }

    public static function bundledDirectory(): string
    {
        return dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'uploads';
    }

    public static function ensure(): void
    {
        $dir = self::directory();
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        $bundled = self::bundledDirectory();
        if (!getenv('VERCEL') || !is_dir($bundled)) {
            return;
        }
        foreach (scandir($bundled) ?: [] as $file) {
            if ($file === '.' || $file === '..' || str_starts_with($file, '.')) {
                continue;
            }
            $dest = $dir . DIRECTORY_SEPARATOR . $file;
            if (!is_file($dest)) {
                copy($bundled . DIRECTORY_SEPARATOR . $file, $dest);
            }
        }
    }

    public static function publicPath(string $filename): string
    {
        return '/uploads/' . $filename;
    }

    public static function saveUploaded(string $kind): string
    {
        self::ensure();
        if (empty($_FILES['file']) || !is_uploaded_file($_FILES['file']['tmp_name'])) {
            throw new HttpException(400, 'Please choose an image.');
        }
        $file = $_FILES['file'];
        if (($file['size'] ?? 0) > 2 * 1024 * 1024) {
            throw new HttpException(400, 'Image must be 2MB or smaller.');
        }
        $mime = mime_content_type($file['tmp_name']) ?: '';
        $allowed = [
            'image/png' => '.png',
            'image/jpeg' => '.jpg',
            'image/jpg' => '.jpg',
            'image/webp' => '.webp',
        ];
        if (!isset($allowed[$mime])) {
            throw new HttpException(400, 'Please upload a PNG, JPG, or WEBP image.');
        }
        $filename = $kind . '-' . (int) round(microtime(true) * 1000) . $allowed[$mime];
        $dest = self::directory() . DIRECTORY_SEPARATOR . $filename;
        if (!move_uploaded_file($file['tmp_name'], $dest)) {
            throw new HttpException(500, 'Could not save the image.');
        }
        return self::publicPath($filename);
    }

    public static function saveDataUrl(string $dataUrl, string $kind): string
    {
        self::ensure();
        if (!preg_match('#^data:image/(png|jpeg|jpg|webp);base64,(.+)$#i', $dataUrl, $match)) {
            throw new HttpException(400, 'Invalid signature image. Please draw or upload a PNG image.');
        }
        $ext = strtolower($match[1]) === 'jpeg' ? 'jpg' : strtolower($match[1]);
        $filename = $kind . '-' . (int) round(microtime(true) * 1000) . '.' . $ext;
        $dest = self::directory() . DIRECTORY_SEPARATOR . $filename;
        file_put_contents($dest, base64_decode($match[2]));
        return self::publicPath($filename);
    }

    public static function remove(?string $publicPath): void
    {
        if (!$publicPath || !str_starts_with($publicPath, '/uploads/')) {
            return;
        }
        $full = self::directory() . DIRECTORY_SEPARATOR . basename($publicPath);
        if (is_file($full)) {
            unlink($full);
        }
    }

    public static function sendFile(string $requestPath): bool
    {
        if (!str_starts_with($requestPath, '/uploads/')) {
            return false;
        }
        self::ensure();
        $full = self::directory() . DIRECTORY_SEPARATOR . basename($requestPath);
        if (!is_file($full)) {
            return false;
        }
        $mime = mime_content_type($full) ?: 'application/octet-stream';
        header('Content-Type: ' . $mime);
        header('Cache-Control: public, max-age=31536000');
        readfile($full);
        return true;
    }
}
