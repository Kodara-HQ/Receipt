import { useMemo, useState } from "react";
import { api, fileUrl } from "../api/client";
import { useSettings } from "../context/SettingsContext";
import { useToast } from "../context/ToastContext";
import Receipt from "../components/receipt/Receipt";
import SignaturePad from "../components/signature/SignaturePad";
import ProductManager from "../components/ProductManager";
import { Field, btnGhost, btnPrimary, inputClass } from "../components/ui/Field";

const SAMPLE_SALE = {
  receipt_number: "202609030001",
  customer_name: "Ama Mensah",
  customer_phone: "",
  subtotal: 280,
  discount: 10,
  total: 270,
  amount_paid: 300,
  change_amount: 30,
  payment_method: "Mobile Money",
  cashier: "Shop Attendant",
  created_at: new Date().toISOString(),
  items: [
    {
      id: 1,
      product_name: "Midnight Oud (50ml)",
      product_type: "Perfume",
      quantity: 1,
      unit_price: 280,
      subtotal: 280,
    },
  ],
};

export default function ReceiptSettings() {
  const { settings, setSettings } = useSettings();
  const { push } = useToast();
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);

  const previewSettings = useMemo(() => ({ ...settings, ...form }), [settings, form]);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event) {
    event.preventDefault();
    if (!form.company_name.trim()) {
      push("Company name is required.", "error");
      return;
    }
    setSaving(true);
    try {
      const updated = await api.put("/api/settings", form);
      setSettings(updated);
      setForm(updated);
      push("Receipt settings saved.");
    } catch (error) {
      push(error.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function uploadFile(kind, file) {
    if (!file) return;
    const data = new FormData();
    data.append("file", file);
    try {
      const updated = await api.post(`/api/settings/${kind}`, data);
      setSettings(updated);
      setForm(updated);
      push(`${kind === "logo" ? "Logo" : "Signature"} uploaded.`);
    } catch (error) {
      push(error.message, "error");
    }
  }

  async function removeAsset(kind) {
    try {
      const updated = await api.delete(`/api/settings/${kind}`);
      setSettings(updated);
      setForm(updated);
      push(`${kind === "logo" ? "Logo" : "Signature"} removed.`);
    } catch (error) {
      push(error.message, "error");
    }
  }

  async function saveDrawnSignature(dataUrl) {
    try {
      const updated = await api.post("/api/settings/signature", { data_url: dataUrl });
      setSettings(updated);
      setForm(updated);
      push("Drawn signature saved.");
    } catch (error) {
      push(error.message, "error");
    }
  }

  if (!form) return null;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-gold-600">Shop</p>
        <h1 className="mt-1 font-display text-3xl text-plum-800">Settings</h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <form className="space-y-5 rounded-2xl bg-white p-5 shadow-card" onSubmit={save}>
          <Field label="Company name">
            <input className={inputClass} value={form.company_name} onChange={(e) => update("company_name", e.target.value)} />
          </Field>
          <Field label="Address">
            <textarea className={inputClass} rows="2" value={form.address || ""} onChange={(e) => update("address", e.target.value)} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Phone number">
              <input className={inputClass} value={form.phone || ""} onChange={(e) => update("phone", e.target.value)} />
            </Field>
            <Field label="Email">
              <input className={inputClass} value={form.email || ""} onChange={(e) => update("email", e.target.value)} />
            </Field>
          </div>
          <Field label="Receipt footer message">
            <textarea className={inputClass} rows="2" value={form.receipt_footer || ""} onChange={(e) => update("receipt_footer", e.target.value)} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Currency">
              <input className={inputClass} value={form.currency || "GH₵"} onChange={(e) => update("currency", e.target.value)} />
            </Field>
            <Field label="Receipt paper size">
              <select className={inputClass} value={form.receipt_paper_size} onChange={(e) => update("receipt_paper_size", e.target.value)}>
                <option value="thermal">Thermal (80mm)</option>
                <option value="a4">A4</option>
              </select>
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Show customer information">
              <select
                className={inputClass}
                value={form.show_customer_info ? "yes" : "no"}
                onChange={(e) => update("show_customer_info", e.target.value === "yes")}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </Field>
            <Field label="Show cashier name">
              <select
                className={inputClass}
                value={form.show_cashier_name ? "yes" : "no"}
                onChange={(e) => update("show_cashier_name", e.target.value === "yes")}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </Field>
          </div>
          <Field label="Cashier's name">
            <input
              className={inputClass}
              value={form.default_cashier || ""}
              onChange={(e) => update("default_cashier", e.target.value)}
              placeholder="Daniella Delali"
            />
          </Field>

          <section className="rounded-2xl border border-cream-200 p-4">
            <h2 className="font-display text-xl text-plum-800">Company logo</h2>
            <div className="mt-3 flex items-center gap-4">
              {form.logo ? (
                <img src={fileUrl(form.logo)} alt="Logo preview" className="h-16 w-16 rounded-xl object-contain bg-cream-100 p-1" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-cream-100 text-xs text-ink-400">
                  No logo
                </div>
              )}
              <div className="space-y-2">
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => uploadFile("logo", e.target.files[0])} />
                {form.logo && (
                  <button type="button" className="block text-sm text-rose-700" onClick={() => removeAsset("logo")}>
                    Remove logo
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-cream-200 p-4">
            <h2 className="font-display text-xl text-plum-800">Company signature</h2>
            <p className="mt-1 text-sm text-ink-500">
              Upload a PNG signature or draw one. It appears above “Authorized Signature” on receipts.
            </p>
            <Field label="Show signature on receipts">
              <select
                className={`${inputClass} mt-2`}
                value={form.signature_enabled ? "yes" : "no"}
                onChange={(e) => update("signature_enabled", e.target.value === "yes")}
              >
                <option value="yes">Enabled</option>
                <option value="no">Disabled</option>
              </select>
            </Field>

            <div className="mt-4">
              <p className="mb-2 text-sm font-medium">Option 1 — Upload signature</p>
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => uploadFile("signature", e.target.files[0])} />
            </div>

            <div className="mt-5">
              <p className="mb-2 text-sm font-medium">Option 2 — Draw signature</p>
              <SignaturePad onSave={saveDrawnSignature} />
            </div>

            <div className="mt-5">
              <p className="mb-2 text-sm font-medium">Preview</p>
              {form.signature ? (
                <div className="rounded-xl bg-cream-50 p-4">
                  <img src={fileUrl(form.signature)} alt="Signature preview" className="max-h-20 object-contain" />
                  <button type="button" className="mt-3 text-sm text-rose-700" onClick={() => removeAsset("signature")}>
                    Remove signature
                  </button>
                </div>
              ) : (
                <p className="text-sm text-ink-400">No signature saved yet.</p>
              )}
            </div>
          </section>

          <button type="submit" className={btnPrimary} disabled={saving}>
            {saving ? "Saving…" : "Save receipt settings"}
          </button>
        </form>

        <aside className="rounded-2xl bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl text-plum-800">Live preview</h2>
            <span className={`${btnGhost} pointer-events-none py-1 text-xs`}>
              {previewSettings.receipt_paper_size === "a4" ? "A4" : "Thermal"}
            </span>
          </div>
          <div className="overflow-auto rounded-2xl bg-cream-200 p-4">
            <Receipt
              sale={{ ...SAMPLE_SALE, cashier: previewSettings.default_cashier || SAMPLE_SALE.cashier }}
              settings={previewSettings}
              preview
            />
          </div>
        </aside>
      </div>

      <ProductManager />
    </div>
  );
}
