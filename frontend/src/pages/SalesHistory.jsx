import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useSettings } from "../context/SettingsContext";
import { useToast } from "../context/ToastContext";
import ReceiptPreviewModal from "../components/receipt/ReceiptPreviewModal";
import Modal from "../components/ui/Modal";
import { btnGhost, btnPrimary, inputClass } from "../components/ui/Field";
import { formatDateTime, money } from "../utils/format";

export default function SalesHistory() {
  const { settings } = useSettings();
  const currency = settings?.currency || "GH₵";
  const { push } = useToast();
  const [sales, setSales] = useState([]);
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (paymentMethod) params.set("payment_method", paymentMethod);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const data = await api.get(`/api/sales?${params.toString()}`);
    setSales(data);
  }

  useEffect(() => {
    load().catch((err) => push(err.message, "error"));
  }, [search, paymentMethod, from, to]);

  async function openSale(sale) {
    try {
      const full = await api.get(`/api/sales/${sale.id}`);
      setSelected(full);
    } catch (error) {
      push(error.message, "error");
    }
  }

  async function deleteOne() {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await api.delete(`/api/sales/${confirmDelete.id}`);
      push(`${confirmDelete.receipt_number} deleted.`);
      setConfirmDelete(null);
      await load();
    } catch (error) {
      push(error.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function clearAll() {
    setBusy(true);
    try {
      await api.delete("/api/sales");
      push("All receipts have been cleared.");
      setConfirmClear(false);
      setSelected(null);
      await load();
    } catch (error) {
      push(error.message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-gold-600">Records</p>
          <h1 className="mt-1 font-display text-3xl text-plum-800">Receipts</h1>
        </div>
        {sales.length > 0 && (
          <button type="button" className={`${btnGhost} text-rose-700`} onClick={() => setConfirmClear(true)}>
            Clear all receipts
          </button>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <input
          className={inputClass}
          placeholder="Search receipt or customer"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select className={inputClass} value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
          <option value="">All payment methods</option>
          <option>Cash</option>
          <option>Mobile Money</option>
          <option>Card</option>
          <option>Other</option>
        </select>
        <input type="date" className={inputClass} value={from} onChange={(event) => setFrom(event.target.value)} />
        <input type="date" className={inputClass} value={to} onChange={(event) => setTo(event.target.value)} />
      </div>

      <div className="hidden overflow-hidden rounded-2xl bg-white shadow-card lg:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-cream-50 text-ink-400">
            <tr>
              <th className="px-4 py-3 font-medium">Receipt Number</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Payment Method</th>
              <th className="px-4 py-3 font-medium">Cashier</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr key={sale.id} className="border-t border-cream-200">
                <td className="px-4 py-3 font-medium">{sale.receipt_number}</td>
                <td className="px-4 py-3">{formatDateTime(sale.created_at)}</td>
                <td className="px-4 py-3">{sale.customer_name || "Walk-in"}</td>
                <td className="px-4 py-3">{money(sale.total, currency)}</td>
                <td className="px-4 py-3">{sale.payment_method}</td>
                <td className="px-4 py-3">{sale.cashier || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <button type="button" className="text-plum-700 hover:underline" onClick={() => openSale(sale)}>
                      View / reprint
                    </button>
                    <button type="button" className="text-rose-700 hover:underline" onClick={() => setConfirmDelete(sale)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sales.length === 0 && <p className="px-4 py-8 text-center text-ink-500">No sales match these filters.</p>}
      </div>

      <div className="grid gap-3 lg:hidden">
        {sales.map((sale) => (
          <article key={sale.id} className="rounded-2xl bg-white p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{sale.receipt_number}</p>
                <p className="text-xs text-ink-400">{formatDateTime(sale.created_at)}</p>
              </div>
              <p className="font-semibold">{money(sale.total, currency)}</p>
            </div>
            <p className="mt-2 text-sm text-ink-500">
              {sale.customer_name || "Walk-in"} · {sale.payment_method}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" className={btnGhost} onClick={() => openSale(sale)}>
                View
              </button>
              <button type="button" className={`${btnGhost} text-rose-700`} onClick={() => setConfirmDelete(sale)}>
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>

      {selected && (
        <ReceiptPreviewModal sale={selected} settings={settings} onClose={() => setSelected(null)} />
      )}

      {confirmDelete && (
        <Modal title="Delete receipt" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-ink-700">
            Delete <strong>{confirmDelete.receipt_number}</strong>? This cannot be undone.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setConfirmDelete(null)}>
              Cancel
            </button>
            <button
              type="button"
              className={`${btnPrimary} bg-rose-700 hover:bg-rose-800`}
              disabled={busy}
              onClick={deleteOne}
            >
              {busy ? "Deleting…" : "Delete"}
            </button>
          </div>
        </Modal>
      )}

      {confirmClear && (
        <Modal title="Clear all receipts" onClose={() => setConfirmClear(false)}>
          <p className="text-sm text-ink-700">
            This removes every receipt and starts numbering again from today's first receipt.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setConfirmClear(false)}>
              Cancel
            </button>
            <button
              type="button"
              className={`${btnPrimary} bg-rose-700 hover:bg-rose-800`}
              disabled={busy}
              onClick={clearAll}
            >
              {busy ? "Clearing…" : "Clear all"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
