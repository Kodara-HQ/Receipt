import { Router } from "express";
import { query } from "../config/db.js";
import { asyncHandler, httpError } from "../middleware/errorHandler.js";

import { PRODUCT_TYPES } from "../constants/productTypes.js";

const router = Router();
const CATEGORIES = PRODUCT_TYPES;
const STATUSES = ["active", "inactive"];

function parseProduct(body, { partial = false } = {}) {
  const data = {};

  if (!partial || body.name !== undefined) {
    const name = String(body.name || "").trim();
    if (!name) throw httpError(400, "Product name is required.");
    data.name = name;
  }

  if (!partial || body.category !== undefined) {
    if (!CATEGORIES.includes(body.category)) {
      throw httpError(400, `Category must be one of: ${CATEGORIES.join(", ")}.`);
    }
    data.category = body.category;
  }

  if (!partial || body.variant !== undefined) {
    data.variant = String(body.variant || "").trim();
  }

  if (!partial || body.selling_price !== undefined) {
    const sellingPrice = Number(body.selling_price);
    if (Number.isNaN(sellingPrice) || sellingPrice < 0) {
      throw httpError(400, "Selling price must be a number of 0 or more.");
    }
    data.selling_price = sellingPrice;
  }

  if (!partial || body.cost_price !== undefined) {
    if (body.cost_price === "" || body.cost_price === null || body.cost_price === undefined) {
      data.cost_price = null;
    } else {
      const costPrice = Number(body.cost_price);
      if (Number.isNaN(costPrice) || costPrice < 0) {
        throw httpError(400, "Cost price must be a number of 0 or more.");
      }
      data.cost_price = costPrice;
    }
  }

  if (!partial || body.stock_quantity !== undefined) {
    const stock = Number(body.stock_quantity);
    if (!Number.isInteger(stock) || stock < 0) {
      throw httpError(400, "Stock quantity must be a whole number of 0 or more.");
    }
    data.stock_quantity = stock;
  }

  if (!partial || body.low_stock_threshold !== undefined) {
    const threshold = Number(body.low_stock_threshold ?? 5);
    if (!Number.isInteger(threshold) || threshold < 0) {
      throw httpError(400, "Low stock threshold must be a whole number of 0 or more.");
    }
    data.low_stock_threshold = threshold;
  }

  if (!partial || body.status !== undefined) {
    const status = body.status || "active";
    if (!STATUSES.includes(status)) {
      throw httpError(400, "Status must be active or inactive.");
    }
    data.status = status;
  }

  return data;
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = String(req.query.search || "").trim();
    const category = String(req.query.category || "").trim();
    const status = String(req.query.status || "").trim();
    const params = [];
    const where = [];

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      where.push(`(LOWER(name) LIKE $${params.length} OR LOWER(COALESCE(variant, '')) LIKE $${params.length})`);
    }
    if (category && CATEGORIES.includes(category)) {
      params.push(category);
      where.push(`category = $${params.length}`);
    }
    if (status && STATUSES.includes(status)) {
      params.push(status);
      where.push(`status = $${params.length}`);
    }

    const sql = `
      SELECT *,
        (stock_quantity <= low_stock_threshold) AS is_low_stock
      FROM products
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY name ASC
    `;
    const { rows } = await query(sql, params);
    res.json(rows);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT *, (stock_quantity <= low_stock_threshold) AS is_low_stock
       FROM products WHERE id = $1`,
      [req.params.id]
    );
    if (!rows[0]) throw httpError(404, "Product not found.");
    res.json(rows[0]);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = parseProduct(req.body);
    const { rows } = await query(
      `INSERT INTO products
        (name, category, variant, selling_price, cost_price, stock_quantity, low_stock_threshold, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *, (stock_quantity <= low_stock_threshold) AS is_low_stock`,
      [
        data.name,
        data.category,
        data.variant,
        data.selling_price,
        data.cost_price,
        data.stock_quantity,
        data.low_stock_threshold,
        data.status,
      ]
    );
    res.status(201).json(rows[0]);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = parseProduct(req.body);
    const { rows } = await query(
      `UPDATE products SET
        name = $1,
        category = $2,
        variant = $3,
        selling_price = $4,
        cost_price = $5,
        stock_quantity = $6,
        low_stock_threshold = $7,
        status = $8,
        updated_at = NOW()
       WHERE id = $9
       RETURNING *, (stock_quantity <= low_stock_threshold) AS is_low_stock`,
      [
        data.name,
        data.category,
        data.variant,
        data.selling_price,
        data.cost_price,
        data.stock_quantity,
        data.low_stock_threshold,
        data.status,
        req.params.id,
      ]
    );
    if (!rows[0]) throw httpError(404, "Product not found.");
    res.json(rows[0]);
  })
);

router.patch(
  "/:id/stock",
  asyncHandler(async (req, res) => {
    const delta = Number(req.body.delta);
    if (!Number.isInteger(delta) || delta === 0) {
      throw httpError(400, "Provide a whole-number stock change.");
    }

    const { rows } = await query(
      `UPDATE products
       SET stock_quantity = stock_quantity + $1, updated_at = NOW()
       WHERE id = $2 AND stock_quantity + $1 >= 0
       RETURNING *, (stock_quantity <= low_stock_threshold) AS is_low_stock`,
      [delta, req.params.id]
    );
    if (!rows[0]) {
      throw httpError(400, "Stock cannot go below zero, or the product was not found.");
    }
    res.json(rows[0]);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await query("UPDATE sale_items SET product_id = NULL WHERE product_id = $1", [req.params.id]);
    const { rowCount } = await query("DELETE FROM products WHERE id = $1", [req.params.id]);
    if (!rowCount) throw httpError(404, "Product not found.");
    res.json({ ok: true });
  })
);

export default router;
