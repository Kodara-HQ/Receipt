export async function downloadReceiptPdf(element, filename) {
  const html2pdf = (await import("html2pdf.js")).default;
  const sheet = element?.querySelector?.(".receipt-sheet") || element;
  const paper = sheet?.dataset?.paper || element?.dataset?.paper || "thermal";
  const width = paper === "a4" ? 210 : 80;
  const height = Math.max((sheet?.scrollHeight || 600) * 0.35, paper === "a4" ? 297 : 200);

  await html2pdf()
    .set({
      margin: paper === "a4" ? 8 : 2,
      filename,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
      jsPDF: { unit: "mm", format: [width, height], orientation: "portrait" },
    })
    .from(sheet || element)
    .save();
}

function waitForImages(doc) {
  return Promise.all(
    [...doc.images].map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise((resolve) => {
        image.onload = resolve;
        image.onerror = resolve;
      });
    })
  );
}

export async function printReceipt(element) {
  const sheet = element?.querySelector?.(".receipt-sheet") || element;
  if (!sheet) {
    window.print();
    return;
  }

  const paper = sheet.dataset.paper || "thermal";
  const iframe = document.createElement("iframe");
  iframe.setAttribute(
    "style",
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;"
  );
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  doc.open();
  doc.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>THE FRAGRANCE UNIVERSE Receipt</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        background: #fff;
      }
      body {
        display: flex;
        justify-content: center;
      }
      @page {
        size: ${paper === "a4" ? "A4" : "80mm auto"};
        margin: ${paper === "a4" ? "10mm" : "3mm"};
      }
      @media print {
        html, body { background: #fff; }
      }
    </style>
  </head>
  <body>${sheet.outerHTML}</body>
</html>`);
  doc.close();

  await waitForImages(doc);
  await new Promise((resolve) => setTimeout(resolve, 250));

  iframe.contentWindow.focus();
  iframe.contentWindow.print();
  setTimeout(() => iframe.remove(), 1500);
}
