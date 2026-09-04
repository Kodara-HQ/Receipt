import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { httpError } from "./errorHandler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localUploadsDir = path.join(__dirname, "..", "..", "uploads");
export const uploadsDir = process.env.VERCEL
  ? path.join("/tmp", "fragrance-uploads")
  : localUploadsDir;

export function ensureUploadsDir() {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  if (!process.env.VERCEL || !fs.existsSync(localUploadsDir)) {
    return;
  }
  for (const file of fs.readdirSync(localUploadsDir)) {
    if (file.startsWith(".")) continue;
    const dest = path.join(uploadsDir, file);
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(path.join(localUploadsDir, file), dest);
    }
  }
}

ensureUploadsDir();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const prefix = req.uploadKind || "file";
    const ext = path.extname(file.originalname || "").toLowerCase() || ".png";
    cb(null, `${prefix}-${Date.now()}${ext}`);
  },
});

function imageFilter(_req, file, cb) {
  const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
  if (!allowed.includes(file.mimetype)) {
    cb(httpError(400, "Please upload a PNG, JPG, or WEBP image."));
    return;
  }
  cb(null, true);
}

export const uploadImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});

export function setUploadKind(kind) {
  return (req, _res, next) => {
    req.uploadKind = kind;
    next();
  };
}

export function publicUploadPath(filename) {
  return `/uploads/${filename}`;
}

export function removeUpload(publicPath) {
  if (!publicPath || !publicPath.startsWith("/uploads/")) {
    return;
  }
  const filename = path.basename(publicPath);
  const fullPath = path.join(uploadsDir, filename);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}

export function saveDataUrl(dataUrl, kind) {
  const match = /^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i.exec(dataUrl || "");
  if (!match) {
    throw httpError(400, "Invalid signature image. Please draw or upload a PNG image.");
  }
  const ext = match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase();
  const filename = `${kind}-${Date.now()}.${ext}`;
  fs.writeFileSync(path.join(uploadsDir, filename), Buffer.from(match[2], "base64"));
  return publicUploadPath(filename);
}
