import { Router } from "express";
import { query } from "../config/db.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const todaySales = await query(`
      SELECT
        COALESCE(SUM(total), 0)::numeric AS amount,
        COUNT(*)::int AS transactions
      FROM sales
      WHERE (created_at AT TIME ZONE 'Africa/Accra')::date
          = (NOW() AT TIME ZONE 'Africa/Accra')::date
    `);

    const monthSales = await query(`
      SELECT COALESCE(SUM(total), 0)::numeric AS amount
      FROM sales
      WHERE date_trunc('month', created_at AT TIME ZONE 'Africa/Accra')
          = date_trunc('month', NOW() AT TIME ZONE 'Africa/Accra')
    `);

    const products = await query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE stock_quantity <= low_stock_threshold AND status = 'active')::int AS low_stock
      FROM products
    `);

    const recentSales = await query(`
      SELECT id, receipt_number, customer_name, total, payment_method, cashier, created_at
      FROM sales
      ORDER BY created_at DESC
      LIMIT 8
    `);

    const lowStock = await query(`
      SELECT id, name, category, variant, stock_quantity, low_stock_threshold, selling_price
      FROM products
      WHERE stock_quantity <= low_stock_threshold AND status = 'active'
      ORDER BY stock_quantity ASC, name ASC
      LIMIT 10
    `);

    res.json({
      today_sales: Number(todaySales.rows[0].amount),
      today_transactions: todaySales.rows[0].transactions,
      month_sales: Number(monthSales.rows[0].amount),
      total_products: products.rows[0].total,
      low_stock_count: products.rows[0].low_stock,
      recent_sales: recentSales.rows,
      low_stock_products: lowStock.rows,
    });
  })
);

export default router;
