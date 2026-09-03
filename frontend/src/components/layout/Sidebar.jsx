import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Sidebar({ open, onClose }) {
  const { user, logout, isAdmin } = useAuth();

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
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-plum-900 text-cream-100 transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-white/10 px-6 py-7">
          <p className="text-[11px] uppercase tracking-[0.28em] text-gold-400">Perfumes & Air Fresheners</p>
          <h1 className="mt-2 font-display text-[1.65rem] leading-tight text-cream-50">
            THE FRAGRANCE UNIVERSE
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
                    ? "border border-white/25 bg-gold-500/15 text-gold-300"
                    : "border border-transparent text-cream-100/80 hover:bg-white/5 hover:text-cream-50"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-cream-100">{user?.username}</p>
              <p className="text-xs capitalize text-cream-100/50">{user?.role}</p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-cream-100/70 transition hover:bg-white/10 hover:text-cream-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
