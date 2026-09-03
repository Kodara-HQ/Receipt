import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useSettings } from "../context/SettingsContext";
import { useToast } from "../context/ToastContext";
import ReceiptPreviewModal from "../components/receipt/ReceiptPreviewModal";
import { btnGhost, inputClass } from "../components/ui/Field";
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

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-gold-600">Records</p>
        <h1 className="mt-1 font-display text-3xl text-plum-800">Receipts</h1>
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
                  <button type="button" className="text-plum-700 hover:underline" onClick={() => openSale(sale)}>
                    View / reprint
                  </button>
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
            <button type="button" className={`${btnGhost} mt-3 w-full`} onClick={() => openSale(sale)}>
              View receipt
            </button>
          </article>
        ))}
      </div>

      {selected && (
        <ReceiptPreviewModal sale={selected} settings={settings} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
