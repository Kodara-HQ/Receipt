import { Router } from "express";
import { query, withTransaction } from "../config/db.js";
import { asyncHandler, httpError } from "../middleware/errorHandler.js";

import { nextReceiptNumber } from "../services/receiptNumber.js";

const router = Router();
const PAYMENT_METHODS = ["Cash", "Mobile Money", "Card", "Other"];
const PRODUCT_TYPES = ["Perfume", "Air Freshener", "Other"];


router.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = String(req.query.search || "").trim();
    const paymentMethod = String(req.query.payment_method || "").trim();
    const from = String(req.query.from || "").trim();
    const to = String(req.query.to || "").trim();
    const params = [];
    const where = [];

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      where.push(
        `(LOWER(receipt_number) LIKE $${params.length} OR LOWER(COALESCE(customer_name, '')) LIKE $${params.length})`
      );
    }
    if (paymentMethod && PAYMENT_METHODS.includes(paymentMethod)) {
      params.push(paymentMethod);
      where.push(`payment_method = $${params.length}`);
    }
    if (from) {
      params.push(from);
      where.push(`(created_at AT TIME ZONE 'Africa/Accra')::date >= $${params.length}::date`);
    }
    if (to) {
      params.push(to);
      where.push(`(created_at AT TIME ZONE 'Africa/Accra')::date <= $${params.length}::date`);
    }

    const { rows } = await query(
      `SELECT * FROM sales
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY created_at DESC
       LIMIT 300`,
      params
    );
    res.json(rows);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const sale = await query("SELECT * FROM sales WHERE id = $1", [req.params.id]);
    if (!sale.rows[0]) throw httpError(404, "Sale not found.");
    const items = await query(
      `SELECT * FROM sale_items WHERE sale_id = $1 ORDER BY id ASC`,
      [req.params.id]
    );
    res.json({ ...sale.rows[0], items: items.rows });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (!items.length) {
      throw httpError(400, "Add at least one product to the receipt.");
    }

    const discount = Number(req.body.discount || 0);
    if (Number.isNaN(discount) || discount < 0) {
      throw httpError(400, "Discount must be 0 or more.");
    }

    const amountPaid = Number(req.body.amount_paid);
    if (Number.isNaN(amountPaid) || amountPaid < 0) {
      throw httpError(400, "Amount paid must be 0 or more.");
    }

    const paymentMethod = req.body.payment_method;
    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      throw httpError(400, "Choose a valid payment method.");
    }

    const customerName = String(req.body.customer_name || "").trim() || null;
    const customerPhone = String(req.body.customer_phone || "").trim() || null;
    const cashier = String(req.body.cashier || "").trim() || null;

    const sale = await withTransaction(async (client) => {
      let subtotal = 0;
      const prepared = [];

      for (const item of items) {
        const quantity = Number(item.quantity);
        if (!Number.isInteger(quantity) || quantity <= 0) {
          throw httpError(400, "Each item needs a quantity of 1 or more.");
        }

        const productId = Number(item.product_id) || null;
        let name = String(item.name || item.product_name || "").trim();
        let productType = String(item.product_type || item.category || "").trim();
        let variant = String(item.variant || "").trim();
        let unitPrice = item.unit_price !== undefined ? Number(item.unit_price) : NaN;

        if (productId) {
          const product = await client.query(
            "SELECT * FROM products WHERE id = $1 FOR UPDATE",
            [productId]
          );
          const row = product.rows[0];
          if (!row) throw httpError(400, "One of the selected products was not found.");
          if (row.status !== "active") {
            throw httpError(400, `${row.name} is not available for sale.`);
          }
          if (row.stock_quantity < quantity) {
            throw httpError(
              400,
              `Not enough stock for ${row.name}. Only ${row.stock_quantity} left.`
            );
          }
          name = name || row.name;
          productType = productType || row.category;
          variant = variant || row.variant || "";
          if (Number.isNaN(unitPrice)) unitPrice = Number(row.selling_price);

          await client.query(
            `UPDATE products
             SET stock_quantity = stock_quantity - $1, updated_at = NOW()
             WHERE id = $2`,
            [quantity, productId]
          );
        }

        if (!name) throw httpError(400, "Each item needs a product name.");
        if (!PRODUCT_TYPES.includes(productType)) {
          throw httpError(400, "Choose a product type: Perfume, Air Freshener, or Other.");
        }
        if (Number.isNaN(unitPrice) || unitPrice < 0) {
          throw httpError(400, "Each item needs a unit price of 0 or more.");
        }

        const lineTotal = Number((unitPrice * quantity).toFixed(2));
        subtotal += lineTotal;
        prepared.push({
          product_id: productId,
          product_name: variant ? `${name} (${variant})` : name,
          product_type: productType,
          variant,
          quantity,
          unit_price: unitPrice,
          subtotal: lineTotal,
        });
      }

      subtotal = Number(subtotal.toFixed(2));
      if (discount > subtotal) {
        throw httpError(400, "Discount cannot be more than the subtotal.");
      }

      const total = Number((subtotal - discount).toFixed(2));
      if (amountPaid < total) {
        throw httpError(400, "Amount paid must cover the grand total.");
      }

      const changeAmount = Number((amountPaid - total).toFixed(2));
      const receiptNumber = await nextReceiptNumber(client);

      const inserted = await client.query(
        `INSERT INTO sales (
          receipt_number, customer_name, customer_phone, subtotal, discount, total,
          amount_paid, change_amount, payment_method, cashier
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        RETURNING *`,
        [
          receiptNumber,
          customerName,
          customerPhone,
          subtotal,
          discount,
          total,
          amountPaid,
          changeAmount,
          paymentMethod,
          cashier,
        ]
      );

      const savedItems = [];
      for (const item of prepared) {
        const result = await client.query(
          `INSERT INTO sale_items
            (sale_id, product_id, product_name, product_type, variant, quantity, unit_price, subtotal)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING *`,
          [
            inserted.rows[0].id,
            item.product_id,
            item.product_name,
            item.product_type,
            item.variant,
            item.quantity,
            item.unit_price,
            item.subtotal,
          ]
        );
        savedItems.push(result.rows[0]);
      }

      return { ...inserted.rows[0], items: savedItems };
    });

    res.status(201).json(sale);
  })
);

export default router;
