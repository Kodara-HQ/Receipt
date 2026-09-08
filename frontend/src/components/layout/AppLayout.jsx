import { useState } from "react";
import { Outlet } from "react-router-dom";
import BrandMark from "../BrandMark";
import Sidebar from "./Sidebar";
import { useSettings } from "../../context/SettingsContext";

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const { loading, error } = useSettings();

  return (
    <div className="app-shell min-h-screen bg-cream-100 text-ink-900">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="lg:pl-72">
        <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-cream-200 bg-cream-100 px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg border border-plum-700/20 px-3 py-2 text-sm font-medium text-plum-800"
          >
            Menu
          </button>
          <BrandMark className="h-9 w-9" />
        </header>
        <main className="px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error} Make sure PostgreSQL is running and the API is available.
            </div>
          )}
          {loading ? (
            <div className="rounded-2xl bg-white p-8 text-ink-500 shadow-card">Loading shop…</div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}
