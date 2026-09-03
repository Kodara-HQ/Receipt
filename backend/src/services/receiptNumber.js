export async function nextReceiptNumber(client) {
  const { rows: dateRows } = await client.query(
    `SELECT to_char((NOW() AT TIME ZONE 'Africa/Accra'), 'YYYYMMDD') AS day_key`
  );
  const dayKey = dateRows[0].day_key;

  const { rows } = await client.query(
    `UPDATE receipt_counter
     SET last_number = CASE WHEN last_date = $1 THEN last_number + 1 ELSE 1 END,
         last_date = $1
     WHERE id = 1
     RETURNING last_number`,
    [dayKey]
  );

  return `${dayKey}${String(rows[0].last_number).padStart(4, "0")}`;
}
