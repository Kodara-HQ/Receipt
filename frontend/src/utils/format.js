const ACCRA = "Africa/Accra";

export function money(value, currency = "GH₵") {
  const amount = Number(value || 0);
  return `${currency} ${amount.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-GB", {
    timeZone: ACCRA,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("en-GB", {
    timeZone: ACCRA,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTime(value) {
  return `${formatDate(value)} · ${formatTime(value)}`;
}

export function todayInputValue() {
  return new Date().toLocaleDateString("en-CA", { timeZone: ACCRA });
}
