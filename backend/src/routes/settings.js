import { Router } from "express";
import { query } from "../config/db.js";
import { asyncHandler, httpError } from "../middleware/errorHandler.js";
import {
  publicUploadPath,
  removeUpload,
  saveDataUrl,
  setUploadKind,
  uploadImage,
} from "../middleware/upload.js";

const router = Router();
const PAPER_SIZES = ["thermal", "a4"];

async function getSettings() {
  const { rows } = await query("SELECT * FROM company_settings WHERE id = 1");
  return rows[0];
}

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await getSettings());
  })
);

router.put(
  "/",
  asyncHandler(async (req, res) => {
    const current = await getSettings();
    const companyName = String(req.body.company_name ?? current.company_name).trim();
    if (!companyName) throw httpError(400, "Company name is required.");

    const paperSize = req.body.receipt_paper_size ?? current.receipt_paper_size;
    if (!PAPER_SIZES.includes(paperSize)) {
      throw httpError(400, "Receipt paper size must be thermal or A4.");
    }

    const currency = String(req.body.currency ?? current.currency).trim() || "GH₵";

    const { rows } = await query(
      `UPDATE company_settings SET
        company_name = $1,
        address = $2,
        phone = $3,
        email = $4,
        receipt_footer = $5,
        signature_enabled = $6,
        currency = $7,
        receipt_paper_size = $8,
        show_customer_info = $9,
        show_cashier_name = $10,
        default_cashier = $11,
        updated_at = NOW()
       WHERE id = 1
       RETURNING *`,
      [
        companyName,
        String(req.body.address ?? current.address ?? ""),
        String(req.body.phone ?? current.phone ?? ""),
        String(req.body.email ?? current.email ?? ""),
        String(req.body.receipt_footer ?? current.receipt_footer ?? ""),
        req.body.signature_enabled ?? current.signature_enabled,
        currency,
        paperSize,
        req.body.show_customer_info ?? current.show_customer_info,
        req.body.show_cashier_name ?? current.show_cashier_name,
        String(req.body.default_cashier ?? current.default_cashier ?? ""),
      ]
    );
    res.json(rows[0]);
  })
);

router.post(
  "/logo",
  setUploadKind("logo"),
  uploadImage.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw httpError(400, "Please choose a logo image.");
    const current = await getSettings();
    const nextPath = publicUploadPath(req.file.filename);
    if (current.logo && current.logo !== nextPath) {
      removeUpload(current.logo);
    }
    const { rows } = await query(
      `UPDATE company_settings SET logo = $1, updated_at = NOW() WHERE id = 1 RETURNING *`,
      [nextPath]
    );
    res.json(rows[0]);
  })
);

router.delete(
  "/logo",
  asyncHandler(async (_req, res) => {
    const current = await getSettings();
    if (current.logo) removeUpload(current.logo);
    const { rows } = await query(
      `UPDATE company_settings SET logo = NULL, updated_at = NOW() WHERE id = 1 RETURNING *`
    );
    res.json(rows[0]);
  })
);

router.post(
  "/signature",
  setUploadKind("signature"),
  uploadImage.single("file"),
  asyncHandler(async (req, res) => {
    const current = await getSettings();
    let nextPath;

    if (req.file) {
      nextPath = publicUploadPath(req.file.filename);
    } else if (req.body.data_url) {
      nextPath = saveDataUrl(req.body.data_url, "signature");
    } else {
      throw httpError(400, "Upload a signature image or save a drawn signature.");
    }

    if (current.signature && current.signature !== nextPath) {
      removeUpload(current.signature);
    }

    const { rows } = await query(
      `UPDATE company_settings
       SET signature = $1, signature_enabled = TRUE, updated_at = NOW()
       WHERE id = 1
       RETURNING *`,
      [nextPath]
    );
    res.json(rows[0]);
  })
);

router.delete(
  "/signature",
  asyncHandler(async (_req, res) => {
    const current = await getSettings();
    if (current.signature) removeUpload(current.signature);
    const { rows } = await query(
      `UPDATE company_settings
       SET signature = NULL, updated_at = NOW()
       WHERE id = 1
       RETURNING *`
    );
    res.json(rows[0]);
  })
);

export default router;
