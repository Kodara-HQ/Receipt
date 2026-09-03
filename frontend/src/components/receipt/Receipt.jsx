import { fileUrl } from "../../api/client";
import { formatDate, formatTime, money } from "../../utils/format";

export default function Receipt({ sale, settings, preview = false }) {
  if (!sale || !settings) return null;

  const paper = settings.receipt_paper_size === "a4" ? "a4" : "thermal";
  const currency = settings.currency || "GH₵";
  const logo = fileUrl(settings.logo);
  // Use the company signature from settings if enabled.
  // A per-sale override (sale.signature) is kept as a fallback for old records.
  const signature = fileUrl(
    (settings.signature_enabled && settings.signature)
      ? settings.signature
      : (sale.signature || "")
  );
  const showCustomer = settings.show_customer_info && (sale.customer_name || sale.customer_phone);
  const footer =
    settings.receipt_footer || "Thank you for shopping with The Fragrance Universe.";

  return (
    <article
      data-paper={paper}
      className={`receipt-sheet bg-white text-black ${
        paper === "a4" ? "receipt-a4" : "receipt-thermal"
      } ${preview ? "receipt-preview" : ""}`}
    >
      <header className="receipt-header">
        {logo ? (
          <img src={logo} alt="" className="receipt-logo" />
        ) : (
          <div className="receipt-monogram">TFU</div>
        )}
        <h1>{settings.company_name || "THE FRAGRANCE UNIVERSE"}</h1>
        <p className="tagline">All Kinds of fragrance (Room, Laundry, Wardrobes, Car, Body etc)</p>
        {settings.address && <p>{settings.address}</p>}
        {settings.phone && <p>{settings.phone}</p>}
        {settings.email && <p>{settings.email}</p>}
      </header>

      <div className="receipt-rule" />

      <section className="receipt-meta">
        <p>
          <strong>Receipt:</strong> {sale.receipt_number}
        </p>
        <p>
          <strong>Date:</strong> {formatDate(sale.created_at)}
        </p>
        <p>
          <strong>Time:</strong> {formatTime(sale.created_at)}
        </p>
        {settings.show_cashier_name && sale.cashier && (
          <p>
            <strong>Cashier:</strong> {sale.cashier}
          </p>
        )}
        {showCustomer && sale.customer_name && (
          <p>
            <strong>Customer:</strong> {sale.customer_name}
          </p>
        )}
        {showCustomer && sale.customer_phone && (
          <p>
            <strong>Phone:</strong> {sale.customer_phone}
          </p>
        )}
      </section>

      <section className="receipt-items">
        <div className="items-heading">Items</div>
        {(sale.items || []).map((item) => (
          <div className="receipt-item" key={item.id || `${item.product_name}-${item.quantity}`}>
            <p className="item-name">{item.product_name}</p>
            {item.product_type && <p className="item-type">{item.product_type}</p>}
            <p className="item-row">
              <span>Qty</span>
              <span>{item.quantity}</span>
            </p>
            <p className="item-row">
              <span>Unit Price</span>
              <span>{money(item.unit_price, currency)}</span>
            </p>
            <p className="item-row item-line-total">
              <span>Total</span>
              <span>{money(item.subtotal, currency)}</span>
            </p>
          </div>
        ))}
      </section>

      <section className="receipt-totals">
        <p>
          <span>Subtotal</span>
          <span>{money(sale.subtotal, currency)}</span>
        </p>
        <p>
          <span>Discount</span>
          <span>{money(sale.discount, currency)}</span>
        </p>
        <p className="grand">
          <span>Grand Total</span>
          <span>{money(sale.total, currency)}</span>
        </p>
        <p>
          <span>Amount Paid</span>
          <span>{money(sale.amount_paid, currency)}</span>
        </p>
        <p>
          <span>Change/Balance</span>
          <span>{money(sale.change_amount, currency)}</span>
        </p>
        <p>
          <span>Payment Method</span>
          <span>{sale.payment_method}</span>
        </p>
      </section>

      <section className="receipt-sign">
        <p>Authorized Signature:</p>
        {signature && <img src={signature} alt="Authorized signature" />}
        <div className="sign-line" />
      </section>

      <footer className="receipt-footer">
        <p>{footer}</p>
      </footer>

      <style>{`
        .receipt-sheet {
          color: #111;
          font-family: "Courier New", ui-monospace, monospace;
          line-height: 1.35;
        }
        .receipt-thermal {
          width: 80mm;
          max-width: 100%;
          padding: 10px 8px 16px;
          font-size: 12px;
        }
        .receipt-a4 {
          width: 190mm;
          max-width: 100%;
          padding: 18mm 16mm;
          font-size: 14px;
        }
        .receipt-preview {
          box-shadow: 0 12px 30px -18px rgba(0,0,0,.35);
          margin: 0 auto;
        }
        .receipt-header {
          text-align: center;
        }
        .receipt-logo {
          max-height: 56px;
          max-width: 140px;
          object-fit: contain;
          margin: 0 auto 8px;
          display: block;
        }
        .receipt-monogram {
          width: 46px;
          height: 46px;
          margin: 0 auto 8px;
          border: 1px solid #111;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: "Playfair Display", Georgia, serif;
          font-size: 12px;
          letter-spacing: 0.08em;
        }
        .receipt-header h1 {
          margin: 0;
          font-family: "Playfair Display", Georgia, serif;
          font-size: 1.15em;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .tagline {
          margin: 2px 0 8px;
          font-size: 0.92em;
        }
        .receipt-header p {
          margin: 0;
        }
        .receipt-rule {
          border-top: 1px dashed #111;
          margin: 10px 0;
        }
        .receipt-meta p {
          margin: 0 0 2px;
        }
        .receipt-items {
          margin: 12px 0;
        }
        .items-heading {
          border-bottom: 1px solid #111;
          font-weight: 700;
          letter-spacing: 0.04em;
          padding-bottom: 4px;
          text-transform: uppercase;
        }
        .receipt-item {
          border-bottom: 1px dotted #999;
          padding: 10px 0 8px;
        }
        .item-name {
          margin: 0;
          font-weight: 700;
          word-break: break-word;
        }
        .item-type {
          margin: 2px 0 8px;
          font-size: 0.9em;
          opacity: 0.8;
        }
        .item-row {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          margin: 3px 0 0;
        }
        .item-row span:last-child {
          white-space: nowrap;
          text-align: right;
        }
        .item-line-total {
          font-weight: 700;
          margin-top: 6px;
        }
        .receipt-totals p {
          display: flex;
          justify-content: space-between;
          margin: 3px 0;
        }
        .receipt-totals .grand {
          font-weight: 700;
          border-top: 1px dashed #111;
          padding-top: 6px;
          margin-top: 6px;
        }
        .receipt-sign {
          margin-top: 18px;
          text-align: center;
        }
        .receipt-sign img {
          display: block;
          max-height: 54px;
          max-width: 160px;
          margin: 6px auto 0;
          object-fit: contain;
        }
        .sign-line {
          border-top: 1px solid #111;
          width: 70%;
          margin: 4px auto 0;
        }
        .receipt-footer {
          margin-top: 16px;
          text-align: center;
          font-size: 0.95em;
        }
        @media print {
          @page {
            size: ${paper === "a4" ? "A4" : "80mm auto"};
            margin: ${paper === "a4" ? "10mm" : "2mm"};
          }
          .receipt-sheet {
            width: 100% !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </article>
  );
}
