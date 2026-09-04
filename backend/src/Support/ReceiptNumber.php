<?php

declare(strict_types=1);

namespace App\Support;

class ReceiptNumber
{
    public static function next(Database $db): string
    {
        $day = $db->queryOne("SELECT DATE_FORMAT(CURDATE(), '%Y%m%d') AS day_key");
        $dayKey = $day['day_key'];
        $db->execute(
            'UPDATE receipt_counter
             SET last_number = CASE WHEN last_date = ? THEN last_number + 1 ELSE 1 END,
                 last_date = ?
             WHERE id = 1',
            [$dayKey, $dayKey]
        );
        $row = $db->queryOne('SELECT last_number FROM receipt_counter WHERE id = 1');
        return $dayKey . str_pad((string) $row['last_number'], 4, '0', STR_PAD_LEFT);
    }
}
