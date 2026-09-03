import { Router } from "express";
import products from "./products.js";
import sales from "./sales.js";
import settings from "./settings.js";
import dashboard from "./dashboard.js";
import auth from "./auth.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Auth routes (login is public, rest require token)
router.use("/auth", auth);

// All business routes require a valid JWT
router.use("/products", requireAuth, products);
router.use("/sales", requireAuth, sales);
router.use("/settings", requireAuth, settings);
router.use("/dashboard", requireAuth, dashboard);

export default router;
