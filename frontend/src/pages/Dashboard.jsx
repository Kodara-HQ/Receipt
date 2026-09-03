import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useSettings } from "../context/SettingsContext";
import { formatDateTime, money } from "../utils/format";

export default function Dashboard() {
  const { settings } = useSettings();
  const currency = settings?.currency || "GH₵";
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/api/dashboard")
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return <p className="rounded-2xl bg-rose-50 p-4 text-rose-800">{error}</p>;
  }
  if (!data) {
    return <p className="text-ink-500">Loading dashboard…</p>;
  }

  const cards = [
    { label: "Today's Sales", value: money(data.today_sales, currency) },
    { label: "Today's Transactions", value: data.today_transactions },
    { label: "Total Products", value: data.total_products },
    { label: "Products Low in Stock", value: data.low_stock_count },
    { label: "This Month's Sales", value: money(data.month_sales, currency) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-gold-600">Overview</p>
        <h1 className="mt-1 font-display text-3xl text-plum-800">Dashboard</h1>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <article key={card.label} className="rounded-2xl bg-white p-4 shadow-card">
            <p className="text-xs uppercase tracking-wide text-ink-400">{card.label}</p>
            <p className="mt-2 font-display text-2xl text-plum-800">{card.value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-2xl bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl text-plum-800">Recent sales</h2>
            <Link to="/sales" className="text-sm text-gold-600 hover:underline">
              View all
            </Link>
          </div>
          {data.recent_sales.length === 0 ? (
            <p className="text-sm text-ink-500">No sales yet. Start with a new sale.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[460px] text-left text-sm">
                <thead className="text-ink-400">
                  <tr>
                    <th className="pb-2 font-medium">Receipt</th>
                    <th className="pb-2 font-medium">Customer</th>
                    <th className="pb-2 font-medium">Total</th>
                    <th className="pb-2 font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_sales.map((sale) => (
                    <tr key={sale.id} className="border-t border-cream-200">
                      <td className="py-2.5 font-medium">{sale.receipt_number}</td>
                      <td className="py-2.5">{sale.customer_name || "Walk-in"}</td>
                      <td className="py-2.5">{money(sale.total, currency)}</td>
                      <td className="py-2.5 text-ink-500">{formatDateTime(sale.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="rounded-2xl bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl text-plum-800">Low-stock products</h2>
            <Link to="/products" className="text-sm text-gold-600 hover:underline">
              Manage stock
            </Link>
          </div>
          {data.low_stock_products.length === 0 ? (
            <p className="text-sm text-ink-500">All products are above their stock threshold.</p>
          ) : (
            <ul className="space-y-3">
              {data.low_stock_products.map((product) => (
                <li key={product.id} className="flex items-center justify-between gap-3 rounded-xl bg-rose-50 px-3 py-2.5">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-xs text-ink-500">
                      {product.category}
                      {product.variant ? ` · ${product.variant}` : ""}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-rose-700">
                    {product.stock_quantity} left
                  </p>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </div>
  );
}
