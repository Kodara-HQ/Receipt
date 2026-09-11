import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import BrandMark from "../BrandMark";
import Copyright from "../Copyright";

export default function Sidebar({ open, onClose }) {
  const { user, logout, isAdmin } = useAuth();
  const { settings } = useSettings();
  const companyName = settings?.company_name || "EVERY FRAGRANCE";

  const LINKS = [
    { to: "/", label: "Generate Receipt" },
    { to: "/receipts", label: "Receipts" },
    { to: "/settings", label: "Settings" },
    ...(isAdmin ? [{ to: "/users", label: "Users" }] : []),
  ];

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-plum-950/50 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r-[3px] border-gold-500 bg-white text-ink-900 shadow-[8px_0_28px_-10px_rgba(28,14,22,0.35)] transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-cream-200 px-6 py-7 text-center">
          <BrandMark className="mx-auto h-28 w-28" />
          <h1 className="mt-4 font-display text-[1.65rem] leading-tight text-plum-800">
            {companyName}
          </h1>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-5">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              onClick={onClose}
              className={({ isActive }) =>
                `block rounded-xl px-4 py-3 text-sm tracking-wide transition ${
                  isActive
                    ? "bg-plum-800 text-cream-50"
                    : "text-ink-700 hover:bg-cream-100 hover:text-plum-800"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-cream-200 px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-plum-800">{user?.username}</p>
              <p className="text-xs capitalize text-ink-500">{user?.role}</p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="shrink-0 rounded-lg border border-plum-700/20 px-3 py-1.5 text-xs text-plum-800 transition hover:bg-cream-100"
            >
              Sign out
            </button>
          </div>
          <div className="mt-3">
            <Copyright />
          </div>
        </div>
      </aside>
    </>
  );
}
