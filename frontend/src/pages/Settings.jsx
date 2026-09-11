import { useState } from "react";
import { api } from "../api/client";
import { useSettings } from "../context/SettingsContext";
import { useToast } from "../context/ToastContext";
import { Field, btnPrimary, inputClass } from "../components/ui/Field";

export default function Settings() {
  const { settings, setSettings } = useSettings();
  const { push } = useToast();
  const [form, setForm] = useState({
    default_cashier: settings?.default_cashier || "",
    currency: settings?.currency || "GH₵",
    company_name: settings?.company_name || "EVERY FRAGRANCE",
  });
  const [saving, setSaving] = useState(false);

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const updated = await api.put("/api/settings", {
        ...settings,
        ...form,
      });
      setSettings(updated);
      push("Settings saved.");
    } catch (error) {
      push(error.message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-gold-600">Shop</p>
        <h1 className="mt-1 font-display text-3xl text-plum-800">Settings</h1>
        <p className="mt-2 text-sm text-ink-500">
          Everyday shop defaults. Receipt layout, logo, and signature live under Receipt Settings.
        </p>
      </div>

      <form className="space-y-4 rounded-2xl bg-white p-5 shadow-card" onSubmit={save}>
        <Field label="Company name">
          <input
            className={inputClass}
            value={form.company_name}
            onChange={(event) => setForm({ ...form, company_name: event.target.value })}
          />
        </Field>
        <Field label="Default cashier name" hint="Used on new sales. You can still change it at checkout.">
          <input
            className={inputClass}
            value={form.default_cashier}
            onChange={(event) => setForm({ ...form, default_cashier: event.target.value })}
          />
        </Field>
        <Field label="Currency" hint="Default is Ghana Cedi (GH₵).">
          <input
            className={inputClass}
            value={form.currency}
            onChange={(event) => setForm({ ...form, currency: event.target.value })}
          />
        </Field>
        <button type="submit" className={btnPrimary} disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </button>
      </form>
    </div>
  );
}
