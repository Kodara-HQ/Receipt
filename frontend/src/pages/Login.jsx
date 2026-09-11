import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import BrandMark from "../components/BrandMark";
import Copyright from "../components/Copyright";
import { inputClass, btnPrimary } from "../components/ui/Field";

export default function Login() {
  const { login } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const companyName = settings?.company_name || "EVERY FRAGRANCE";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(username.trim(), password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream-100 px-4">
      <div className="w-full max-w-sm">
        {/* Brand header */}
        <div className="mb-8 text-center">
          <BrandMark className="mx-auto mb-4 h-28 w-28" />
          <h1 className="font-display text-3xl text-plum-900">{companyName}</h1>
          <p className="mt-1 text-sm text-ink-500">All Kinds of fragrance (Room, Laundry, Wardrobes, Car, Body etc)</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl bg-white p-8 shadow-card">
          <h2 className="mb-6 font-display text-2xl text-plum-800">Sign in</h2>

          {error && (
            <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink-700">Username</span>
              <input
                className={inputClass}
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={busy}
                placeholder="admin"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink-700">Password</span>
              <input
                type="password"
                className={inputClass}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
                placeholder="••••••••"
              />
            </label>

            <button
              type="submit"
              className={`${btnPrimary} mt-2 w-full py-3 text-base`}
              disabled={busy}
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-ink-400">
          {companyName} · Receipt System
        </p>
        <div className="mt-2">
          <Copyright />
        </div>
      </div>
    </div>
  );
}
