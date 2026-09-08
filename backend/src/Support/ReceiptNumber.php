<?php

declare(strict_types=1);

namespace App\Support;

class ReceiptNumber
{
    public static function next(array &$data): string
    {
        $dayKey = date('Ymd');
        $counter = $data['counter'] ?? ['last_number' => 0, 'last_date' => ''];
        $next = (($counter['last_date'] ?? '') === $dayKey) ? ((int) $counter['last_number'] + 1) : 1;
        $data['counter'] = ['last_number' => $next, 'last_date' => $dayKey];
        return $dayKey . str_pad((string) $next, 4, '0', STR_PAD_LEFT);
    }
}
