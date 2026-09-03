import { Router } from "express";
import bcrypt from "bcryptjs";
import { query } from "../config/db.js";
import { asyncHandler, httpError } from "../middleware/errorHandler.js";
import { requireAuth, requireAdmin, signToken } from "../middleware/auth.js";

const router = Router();

/* POST /api/auth/login */
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const username = String(req.body.username || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!username || !password) {
      throw httpError(400, "Username and password are required.");
    }

    const { rows } = await query(
      "SELECT * FROM users WHERE LOWER(username) = $1",
      [username]
    );
    const user = rows[0];

    if (!user) {
      throw httpError(401, "Invalid username or password.");
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw httpError(401, "Invalid username or password.");
    }

    const token = signToken({ id: user.id, username: user.username, role: user.role });
    res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role },
    });
  })
);

/* GET /api/auth/me  – validate token & return user */
router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      "SELECT id, username, role, created_at FROM users WHERE id = $1",
      [req.user.id]
    );
    if (!rows[0]) throw httpError(404, "User not found.");
    res.json(rows[0]);
  })
);

/* POST /api/auth/change-password */
router.post(
  "/change-password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const current = String(req.body.current_password || "");
    const next = String(req.body.new_password || "");

    if (!current || !next) {
      throw httpError(400, "Current password and new password are required.");
    }
    if (next.length < 6) {
      throw httpError(400, "New password must be at least 6 characters.");
    }

    const { rows } = await query("SELECT * FROM users WHERE id = $1", [req.user.id]);
    const user = rows[0];
    if (!user) throw httpError(404, "User not found.");

    const valid = await bcrypt.compare(current, user.password_hash);
    if (!valid) throw httpError(401, "Current password is incorrect.");

    const hash = await bcrypt.hash(next, 12);
    await query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, user.id]);
    res.json({ ok: true });
  })
);

/* GET /api/auth/users  – admin only */
router.get(
  "/users",
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const { rows } = await query(
      "SELECT id, username, role, created_at FROM users ORDER BY id"
    );
    res.json(rows);
  })
);

/* POST /api/auth/users  – admin only */
router.post(
  "/users",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const username = String(req.body.username || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const role = req.body.role === "admin" ? "admin" : "cashier";

    if (!username || !password) {
      throw httpError(400, "Username and password are required.");
    }
    if (password.length < 6) {
      throw httpError(400, "Password must be at least 6 characters.");
    }

    const exists = await query("SELECT 1 FROM users WHERE LOWER(username) = $1", [username]);
    if (exists.rows[0]) throw httpError(409, "That username is already taken.");

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await query(
      "INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role, created_at",
      [username, hash, role]
    );
    res.status(201).json(rows[0]);
  })
);

/* DELETE /api/auth/users/:id  – admin only, cannot delete self */
router.delete(
  "/users/:id",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    if (Number(req.params.id) === req.user.id) {
      throw httpError(400, "You cannot delete your own account.");
    }
    const { rowCount } = await query("DELETE FROM users WHERE id = $1", [req.params.id]);
    if (!rowCount) throw httpError(404, "User not found.");
    res.json({ ok: true });
  })
);

export default router;
