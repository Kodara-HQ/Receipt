export function formatReceiptNumber(n) {
  return `REC-${String(n).padStart(6, "0")}`;
}

export async function nextReceiptNumber(client) {
  const { rows } = await client.query(
    `UPDATE receipt_counter
     SET last_number = last_number + 1
     WHERE id = 1
     RETURNING last_number`
  );
  return formatReceiptNumber(rows[0].last_number);
}
