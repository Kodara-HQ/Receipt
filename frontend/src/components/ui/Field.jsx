export function Field({ label, children, hint, error }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-400">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-rose-700">{error}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-plum-700/15 bg-white px-3 py-2.5 text-ink-900 outline-none ring-gold-400/30 placeholder:text-ink-400 focus:ring-2";

export const btnPrimary =
  "inline-flex items-center justify-center rounded-xl bg-plum-800 px-4 py-2.5 text-sm font-medium text-cream-50 transition hover:bg-plum-700 disabled:cursor-not-allowed disabled:opacity-60";

export const btnGhost =
  "inline-flex items-center justify-center rounded-xl border border-plum-700/20 bg-white px-4 py-2.5 text-sm font-medium text-plum-800 transition hover:bg-cream-100";
