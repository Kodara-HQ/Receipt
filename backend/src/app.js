import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import routes from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { uploadsDir } from "./middleware/upload.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "8mb" }));
  app.use("/uploads", express.static(uploadsDir));
  app.use("/api", routes);

  app.get("/", (_req, res) => {
    res.json({ name: "THE FRAGRANCE UNIVERSE", ok: true });
  });

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found." });
  });

  app.use(errorHandler);
  return app;
}

export const projectRoot = path.join(__dirname, "..");
