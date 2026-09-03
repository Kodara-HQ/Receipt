import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/client";
import { useSettings } from "../context/SettingsContext";
import { useToast } from "../context/ToastContext";
import Receipt from "../components/receipt/Receipt";
import ReceiptPreviewModal from "../components/receipt/ReceiptPreviewModal";
import { Field, btnGhost, btnPrimary, inputClass } from "../components/ui/Field";
import { money } from "../utils/format";
import { downloadReceiptPdf, printReceipt } from "../utils/pdf";

const EMPTY_ITEM = {
  name: "",
  product_type: "Perfume",
  variant: "",
  quantity: "1",
  unit_price: "",
};

export default function NewSale() {
  const { settings } = useSettings();
  const currency = settings?.currency || "GH₵";
  const { push } = useToast();
  const [item, setItem] = useState(EMPTY_ITEM);
  const [items, setItems] = useState([]);
  const [discount, setDiscount] = useState("0");
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [cashier, setCashier] = useState(settings?.default_cashier || "");
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(null);
  const [lastReceipt, setLastReceipt] = useState(null);
  const [printAfterSave, setPrintAfterSave] = useState(false);
  const printNextRef = useRef(false);
  const previewRef = useRef(null);

  useEffect(() => {
    setCashier(settings?.default_cashier || "");
  }, [settings]);

  const subtotal = items.reduce((sum, line) => sum + line.unit_price * line.quantity, 0);
  const discountValue = Number(discount || 0);
  const total = Math.max(subtotal - (Number.isNaN(discountValue) ? 0 : discountValue), 0);
  const paid = amountPaid === "" ? total : Number(amountPaid || 0);
  const change = paid - total;

  const previewSale = useMemo(
    () => ({
      receipt_number: "REC-••••••",
      customer_name: customerName,
      customer_phone: customerPhone,
      subtotal,
      discount: Number.isNaN(discountValue) ? 0 : discountValue,
      total,
      amount_paid: Number.isNaN(paid) ? 0 : paid,
      change_amount: Number.isNaN(change) ? 0 : change,
      payment_method: paymentMethod,
      cashier,
      created_at: new Date().toISOString(),
      items: items.map((line, index) => ({
        id: index + 1,
        product_name: line.variant ? `${line.name} (${line.variant})` : line.name,
        product_type: line.product_type,
        quantity: line.quantity,
        unit_price: line.unit_price,
        subtotal: line.unit_price * line.quantity,
      })),
    }),
    [items, customerName, customerPhone, subtotal, discountValue, total, paid, change, paymentMethod, cashier]
  );

  function addItem(event) {
    event.preventDefault();
    const name = item.name.trim();
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unit_price);
    if (!name) {
      push("Enter a product name.", "error");
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      push("Quantity must be 1 or more.", "error");
      return;
    }
    if (Number.isNaN(unitPrice) || unitPrice < 0) {
      push("Enter a unit price.", "error");
      return;
    }
    setItems((current) => [
      ...current,
      {
        key: Date.now(),
        name,
        product_type: item.product_type,
        variant: item.variant.trim(),
        quantity,
        unit_price: unitPrice,
      },
    ]);
    setItem(EMPTY_ITEM);
  }

  function removeItem(key) {
    setItems((current) => current.filter((line) => line.key !== key));
  }

  async function generateReceipt(event) {
    event.preventDefault();
    const shouldPrint = printNextRef.current;
    if (!items.length) {
      push("Add at least one product.", "error");
      return;
    }
    if (Number.isNaN(discountValue) || discountValue < 0) {
      push("Discount must be 0 or more.", "error");
      return;
    }
    if (discountValue > subtotal) {
      push("Discount cannot exceed the subtotal.", "error");
      return;
    }
    if (Number.isNaN(paid) || paid < total) {
      push("Amount paid must cover the grand total.", "error");
      return;
    }

    setSaving(true);
    try {
      const sale = await api.post("/api/sales", {
        items: items.map((line) => ({
          name: line.name,
          product_type: line.product_type,
          variant: line.variant,
          quantity: line.quantity,
          unit_price: line.unit_price,
        })),
        discount: discountValue,
        amount_paid: paid,
        payment_method: paymentMethod,
        customer_name: customerName,
        customer_phone: customerPhone,
        cashier,
      });
      setCompleted(sale);
      setLastReceipt(sale);
      setItems([]);
      setDiscount("0");
      setAmountPaid("");
      setCustomerName("");
      setCustomerPhone("");
      setPrintAfterSave(shouldPrint);
      push(`Receipt ${sale.receipt_number} created.`);
    } catch (error) {
      push(error.message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-gold-600">Receipts</p>
        <h1 className="mt-1 font-display text-3xl text-plum-800">Generate Receipt</h1>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5">
          <form className="rounded-2xl bg-white p-4 shadow-card sm:p-5" onSubmit={addItem}>
            <h2 className="font-display text-xl text-plum-800">Add product</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Product name">
                <input
                  className={inputClass}
                  value={item.name}
                  onChange={(e) => setItem({ ...item, name: e.target.value })}
                  placeholder="Midnight Oud"
                />
              </Field>
              <Field label="Product type">
                <select
                  className={inputClass}
                  value={item.product_type}
                  onChange={(e) => setItem({ ...item, product_type: e.target.value })}
                >
                  <option>Perfume</option>
                  <option>Air Freshener</option>
                  <option>Other</option>
                </select>
              </Field>
              <Field label="Size / variant">
                <input
                  className={inputClass}
                  value={item.variant}
                  onChange={(e) => setItem({ ...item, variant: e.target.value })}
                  placeholder="50ml"
                />
              </Field>
              <Field label="Quantity">
                <input
                  type="number"
                  min="1"
                  className={inputClass}
                  value={item.quantity}
                  onChange={(e) => setItem({ ...item, quantity: e.target.value })}
                />
              </Field>
              <Field label={`Unit price (${currency})`}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClass}
                  value={item.unit_price}
                  onChange={(e) => setItem({ ...item, unit_price: e.target.value })}
                />
              </Field>
            </div>
            <button type="submit" className={`${btnPrimary} mt-4`}>
              Add to receipt
            </button>
          </form>

          <div className="rounded-2xl bg-white p-4 shadow-card sm:p-5">
            <h2 className="font-display text-xl text-plum-800">Items on receipt</h2>
            <div className="mt-3 space-y-3">
              {items.length === 0 && <p className="text-sm text-ink-500">Add a product to start the receipt.</p>}
              {items.map((line) => (
                <div key={line.key} className="flex items-start justify-between gap-3 rounded-xl bg-cream-50 p-3">
                  <div>
                    <p className="font-medium">
                      {line.name}
                      {line.variant ? ` (${line.variant})` : ""}
                    </p>
                    <p className="text-xs text-ink-400">
                      {line.product_type} · Qty {line.quantity} · {money(line.unit_price * line.quantity, currency)}
                    </p>
                  </div>
                  <button type="button" className="text-xs text-rose-700" onClick={() => removeItem(line.key)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <form
            className="space-y-4 rounded-2xl bg-white p-4 shadow-card sm:p-5"
            onSubmit={(event) => {
              generateReceipt(event);
            }}
          >
            <h2 className="font-display text-xl text-plum-800">Payment details</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Customer name" hint="Optional">
                <input className={inputClass} value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </Field>
              <Field label="Customer phone" hint="Optional">
                <input className={inputClass} value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
              </Field>
              <Field label="Cashier">
                <input className={inputClass} value={cashier} onChange={(e) => setCashier(e.target.value)} />
              </Field>
              <Field label="Payment method">
                <select className={inputClass} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option>Cash</option>
                  <option>Mobile Money</option>
                  <option>Card</option>
                  <option>Other</option>
                </select>
              </Field>
              <Field label={`Discount (${currency})`}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClass}
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </Field>
              <Field label={`Amount paid (${currency})`}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClass}
                  placeholder={money(total, currency)}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                />
              </Field>
            </div>
            <div className="rounded-xl bg-plum-900 px-4 py-3 text-cream-50">
              <p className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{money(subtotal, currency)}</span>
              </p>
              <p className="mt-2 flex justify-between font-display text-2xl">
                <span>Total</span>
                <span>{money(total, currency)}</span>
              </p>
              <p className="mt-2 flex justify-between text-sm text-gold-300">
                <span>Change / balance</span>
                <span>{money(Number.isNaN(change) ? 0 : change, currency)}</span>
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="submit"
                className={`${btnGhost} w-full py-3`}
                disabled={saving}
                onClick={() => {
                  printNextRef.current = false;
                }}
              >
                {saving ? "Creating receipt…" : "Generate receipt"}
              </button>
              <button
                type="submit"
                className={`${btnPrimary} w-full py-3`}
                disabled={saving}
                onClick={() => {
                  printNextRef.current = true;
                }}
              >
                Generate & print
              </button>
            </div>
          </form>
        </div>

        <aside className="rounded-2xl bg-white p-5 shadow-card xl:sticky xl:top-6 xl:self-start">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl text-plum-800">
              {lastReceipt ? lastReceipt.receipt_number : "Live preview"}
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={btnPrimary}
                onClick={() => printReceipt(previewRef.current)}
                disabled={!lastReceipt && items.length === 0}
              >
                Print
              </button>
              <button
                type="button"
                className={btnGhost}
                disabled={!lastReceipt}
                onClick={() => downloadReceiptPdf(previewRef.current, `${lastReceipt.receipt_number}.pdf`)}
              >
                PDF
              </button>
            </div>
          </div>
          <div className="overflow-auto rounded-2xl bg-cream-200 p-4">
            <div ref={previewRef} className="print-root mx-auto w-fit bg-white">
              <Receipt sale={lastReceipt && items.length === 0 ? lastReceipt : previewSale} settings={settings} preview />
            </div>
          </div>
        </aside>
      </div>

      {completed && (
        <ReceiptPreviewModal
          sale={completed}
          settings={settings}
          autoPrint={printAfterSave}
          onClose={() => {
            setCompleted(null);
            setPrintAfterSave(false);
            printNextRef.current = false;
          }}
        />
      )}
    </div>
  );
}
