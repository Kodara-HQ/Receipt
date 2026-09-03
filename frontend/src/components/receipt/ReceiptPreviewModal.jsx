import { useEffect, useRef, useState } from "react";
import Modal from "../ui/Modal";
import Receipt from "./Receipt";
import { btnGhost, btnPrimary } from "../ui/Field";
import { downloadReceiptPdf, printReceipt } from "../../utils/pdf";
import { useToast } from "../../context/ToastContext";

export default function ReceiptPreviewModal({ sale, settings, onClose, autoPrint = false }) {
  const sheetRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const { push } = useToast();

  useEffect(() => {
    if (!autoPrint) return undefined;
    const timer = setTimeout(() => {
      printReceipt(sheetRef.current);
    }, 350);
    return () => clearTimeout(timer);
  }, [autoPrint, sale?.id]);

  async function handlePdf() {
    if (!sheetRef.current) return;
    setBusy(true);
    try {
      await downloadReceiptPdf(sheetRef.current, `${sale.receipt_number}.pdf`);
      push("Receipt PDF downloaded.");
    } catch (error) {
      push(error.message || "Could not create the PDF.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Receipt ready" onClose={onClose} wide>
      <div className="mb-4 flex flex-wrap gap-2 no-print">
        <button type="button" className={btnPrimary} onClick={() => printReceipt(sheetRef.current)}>
          Print receipt
        </button>
        <button type="button" className={btnGhost} onClick={handlePdf} disabled={busy}>
          {busy ? "Preparing PDF…" : "Download PDF"}
        </button>
      </div>
      <div className="overflow-auto rounded-2xl bg-cream-200 p-3 sm:p-5">
        <div ref={sheetRef} className="print-root mx-auto w-fit bg-white">
          <Receipt sale={sale} settings={settings} preview />
        </div>
      </div>
    </Modal>
  );
}
