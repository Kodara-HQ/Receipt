import jwt from "jsonwebtoken";
import { httpError } from "./errorHandler.js";

const SECRET = process.env.JWT_SECRET || "fragrance_universe_jwt_secret";

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: "12h" });
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return next(httpError(401, "Please log in to continue."));
  }
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    next(httpError(401, "Session expired. Please log in again."));
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return next(httpError(403, "Admin access required."));
  }
  next();
}
