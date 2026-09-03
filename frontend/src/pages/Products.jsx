import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { useSettings } from "../context/SettingsContext";
import { useToast } from "../context/ToastContext";
import Modal from "../components/ui/Modal";
import { Field, btnGhost, btnPrimary, inputClass } from "../components/ui/Field";
import { formatDate, money } from "../utils/format";

const EMPTY = {
  name: "",
  category: "Perfume",
  variant: "",
  selling_price: "",
  cost_price: "",
  stock_quantity: "0",
  low_stock_threshold: "5",
  status: "active",
};

export default function Products() {
  const { settings } = useSettings();
  const currency = settings?.currency || "GH₵";
  const { push } = useToast();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  async function load() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    const data = await api.get(`/api/products?${params.toString()}`);
    setProducts(data);
  }

  useEffect(() => {
    load().catch((err) => push(err.message, "error"));
  }, [search, category]);

  const lowCount = useMemo(
    () => products.filter((product) => product.is_low_stock && product.status === "active").length,
    [products]
  );

  function openCreate() {
    setForm(EMPTY);
    setErrors({});
    setEditing("new");
  }

  function openEdit(product) {
    setForm({
      name: product.name,
      category: product.category,
      variant: product.variant || "",
      selling_price: String(product.selling_price),
      cost_price: product.cost_price ?? "",
      stock_quantity: String(product.stock_quantity),
      low_stock_threshold: String(product.low_stock_threshold),
      status: product.status,
    });
    setErrors({});
    setEditing(product);
  }

  function validate() {
    const next = {};
    if (!form.name.trim()) next.name = "Enter a product name.";
    if (form.selling_price === "" || Number(form.selling_price) < 0) {
      next.selling_price = "Enter a selling price of 0 or more.";
    }
    if (form.stock_quantity === "" || Number(form.stock_quantity) < 0) {
      next.stock_quantity = "Stock cannot be negative.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function save(event) {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        selling_price: Number(form.selling_price),
        cost_price: form.cost_price === "" ? null : Number(form.cost_price),
        stock_quantity: Number(form.stock_quantity),
        low_stock_threshold: Number(form.low_stock_threshold),
      };
      if (editing === "new") {
        await api.post("/api/products", payload);
        push("Product added.");
      } else {
        await api.put(`/api/products/${editing.id}`, payload);
        push("Product updated.");
      }
      setEditing(null);
      await load();
    } catch (error) {
      push(error.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function adjustStock(product, delta) {
    try {
      await api.patch(`/api/products/${product.id}/stock`, { delta });
      await load();
    } catch (error) {
      push(error.message, "error");
    }
  }

  async function removeProduct() {
    try {
      await api.delete(`/api/products/${confirmDelete.id}`);
      push("Product deleted.");
      setConfirmDelete(null);
      await load();
    } catch (error) {
      push(error.message, "error");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-gold-600">Catalogue</p>
          <h1 className="mt-1 font-display text-3xl text-plum-800">Products</h1>
          {lowCount > 0 && (
            <p className="mt-1 text-sm text-rose-700">{lowCount} product(s) are low in stock.</p>
          )}
        </div>
        <button type="button" className={btnPrimary} onClick={openCreate}>
          Add product
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          className={inputClass}
          placeholder="Search products"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select className={`${inputClass} sm:max-w-xs`} value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">All categories</option>
          <option>Perfume</option>
          <option>Air Freshener</option>
          <option>Other</option>
        </select>
      </div>

      <div className="hidden overflow-hidden rounded-2xl bg-white shadow-card md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-cream-50 text-ink-400">
            <tr>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Added</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-t border-cream-200">
                <td className="px-4 py-3">
                  <p className="font-medium">{product.name}</p>
                  <p className="text-xs text-ink-400">{product.variant || "—"}</p>
                </td>
                <td className="px-4 py-3">{product.category}</td>
                <td className="px-4 py-3">{money(product.selling_price, currency)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button type="button" className="rounded-lg border px-2 py-0.5" onClick={() => adjustStock(product, -1)}>
                      −
                    </button>
                    <span className={product.is_low_stock ? "font-semibold text-rose-700" : ""}>
                      {product.stock_quantity}
                    </span>
                    <button type="button" className="rounded-lg border px-2 py-0.5" onClick={() => adjustStock(product, 1)}>
                      +
                    </button>
                  </div>
                  {product.is_low_stock && <p className="mt-1 text-xs text-rose-700">Low stock</p>}
                </td>
                <td className="px-4 py-3 capitalize">{product.status}</td>
                <td className="px-4 py-3 text-ink-500">{formatDate(product.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button type="button" className="text-plum-700 hover:underline" onClick={() => openEdit(product)}>
                      Edit
                    </button>
                    <button type="button" className="text-rose-700 hover:underline" onClick={() => setConfirmDelete(product)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && <p className="px-4 py-8 text-center text-ink-500">No products found.</p>}
      </div>

      <div className="grid gap-3 md:hidden">
        {products.map((product) => (
          <article key={product.id} className="rounded-2xl bg-white p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{product.name}</p>
                <p className="text-xs text-ink-400">
                  {product.category}
                  {product.variant ? ` · ${product.variant}` : ""}
                </p>
              </div>
              <p className="font-semibold">{money(product.selling_price, currency)}</p>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button type="button" className="rounded-lg border px-2" onClick={() => adjustStock(product, -1)}>
                  −
                </button>
                <span className={product.is_low_stock ? "font-semibold text-rose-700" : ""}>
                  {product.stock_quantity}
                </span>
                <button type="button" className="rounded-lg border px-2" onClick={() => adjustStock(product, 1)}>
                  +
                </button>
              </div>
              <div className="flex gap-3 text-sm">
                <button type="button" className="text-plum-700" onClick={() => openEdit(product)}>
                  Edit
                </button>
                <button type="button" className="text-rose-700" onClick={() => setConfirmDelete(product)}>
                  Delete
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {editing && (
        <Modal title={editing === "new" ? "Add product" : "Edit product"} onClose={() => setEditing(null)}>
          <form className="grid gap-3" onSubmit={save}>
            <Field label="Product name" error={errors.name}>
              <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Category">
              <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option>Perfume</option>
                <option>Air Freshener</option>
                <option>Other</option>
              </select>
            </Field>
            <Field label="Size / variant">
              <input className={inputClass} value={form.variant} onChange={(e) => setForm({ ...form, variant: e.target.value })} placeholder="50ml, car clip, room spray…" />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={`Selling price (${currency})`} error={errors.selling_price}>
                <input type="number" min="0" step="0.01" className={inputClass} value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} />
              </Field>
              <Field label={`Cost price (${currency})`} hint="Optional">
                <input type="number" min="0" step="0.01" className={inputClass} value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Stock quantity" error={errors.stock_quantity}>
                <input type="number" min="0" className={inputClass} value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} />
              </Field>
              <Field label="Low stock threshold">
                <input type="number" min="0" className={inputClass} value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })} />
              </Field>
            </div>
            <Field label="Product status">
              <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="submit" className={btnPrimary} disabled={saving}>
                {saving ? "Saving…" : "Save product"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Delete product" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-ink-700">
            Delete <strong>{confirmDelete.name}</strong>? This cannot be undone if the product has never been sold.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setConfirmDelete(null)}>
              Cancel
            </button>
            <button type="button" className={`${btnPrimary} bg-rose-700 hover:bg-rose-800`} onClick={removeProduct}>
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
