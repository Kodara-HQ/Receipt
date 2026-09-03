import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import { useSettings } from "../context/SettingsContext";
import { PRODUCT_TYPES } from "../constants/productTypes";
import { Field, btnGhost, btnPrimary, inputClass } from "./ui/Field";
import { money } from "../utils/format";

const EMPTY = {
  name: "",
  category: PRODUCT_TYPES[0],
  variant: "",
  selling_price: "",
};

export default function ProductManager() {
  const { settings } = useSettings();
  const currency = settings?.currency || "GH₵";
  const { push } = useToast();
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  async function load() {
    const data = await api.get("/api/products");
    setProducts(data);
  }

  useEffect(() => {
    load().catch((err) => push(err.message, "error"));
  }, []);

  async function addProduct(event) {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      push("Enter a product name.", "error");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/products", {
        name,
        category: form.category,
        variant: form.variant.trim(),
        selling_price: form.selling_price === "" ? 0 : Number(form.selling_price),
        stock_quantity: 100,
        low_stock_threshold: 5,
        status: "active",
      });
      push("Product added. It will show in Select product.");
      setForm(EMPTY);
      await load();
    } catch (error) {
      push(error.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function removeProduct(product) {
    try {
      await api.delete(`/api/products/${product.id}`);
      push(`${product.name} removed.`);
      await load();
    } catch (error) {
      push(error.message, "error");
    }
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-card">
      <h2 className="font-display text-xl text-plum-800">Products</h2>
      <p className="mt-1 text-sm text-ink-500">
        Add products here so they appear in the Select product list when generating a receipt.
      </p>

      <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={addProduct}>
        <Field label="Product name">
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ikeda b/s"
          />
        </Field>
        <Field label="Product type">
          <select
            className={inputClass}
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {PRODUCT_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </Field>
        <Field label="Size / variant">
          <input
            className={inputClass}
            value={form.variant}
            onChange={(e) => setForm({ ...form, variant: e.target.value })}
            placeholder="12pcs per pack"
          />
        </Field>
        <Field label={`Selling price (${currency})`} hint="Optional. You can still type the price on the receipt.">
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputClass}
            value={form.selling_price}
            onChange={(e) => setForm({ ...form, selling_price: e.target.value })}
          />
        </Field>
        <div className="sm:col-span-2">
          <button type="submit" className={btnPrimary} disabled={saving}>
            {saving ? "Adding…" : "Add product"}
          </button>
        </div>
      </form>

      <ul className="mt-4 divide-y divide-cream-200 rounded-xl border border-cream-200">
        {products.length === 0 && (
          <li className="px-4 py-3 text-sm text-ink-400">No products yet.</li>
        )}
        {products.map((product) => (
          <li key={product.id} className="flex items-start justify-between gap-3 px-4 py-3">
            <div>
              <p className="font-medium">
                {product.name}
                {product.variant ? ` (${product.variant})` : ""}
              </p>
              <p className="text-xs text-ink-400">
                {product.category}
                {Number(product.selling_price) > 0 ? ` · ${money(product.selling_price, currency)}` : ""}
              </p>
            </div>
            <button type="button" className={`${btnGhost} py-1.5 text-rose-700`} onClick={() => removeProduct(product)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
