export default function Modal({ title, children, onClose, wide = false }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-plum-950/50 p-0 sm:items-center sm:p-6">
      <button type="button" className="no-print absolute inset-0" aria-label="Close" onClick={onClose} />
      <div
        className={`relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-cream-50 p-5 shadow-2xl sm:rounded-3xl sm:p-6 ${
          wide ? "sm:max-w-3xl" : "sm:max-w-lg"
        }`}
      >
        <div className="no-print mb-4 flex items-start justify-between gap-4">
          <h2 className="font-display text-2xl text-plum-800">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-ink-500 hover:bg-cream-200"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
