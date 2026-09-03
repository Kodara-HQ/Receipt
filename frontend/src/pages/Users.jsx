import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Modal from "../components/ui/Modal";
import { Field, btnGhost, btnPrimary, inputClass } from "../components/ui/Field";

export default function Users() {
  const { user: me } = useAuth();
  const { push } = useToast();
  const [users, setUsers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", role: "cashier" });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  async function load() {
    const data = await api.get("/api/auth/users");
    setUsers(data);
  }

  useEffect(() => { load().catch((err) => push(err.message, "error")); }, []);

  async function addUser(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/api/auth/users", form);
      push("User added.");
      setShowAdd(false);
      setForm({ username: "", password: "", role: "cashier" });
      await load();
    } catch (err) {
      push(err.message, "error");
    } finally { setSaving(false); }
  }

  async function deleteUser() {
    try {
      await api.delete(`/api/auth/users/${confirmDelete.id}`);
      push("User deleted.");
      setConfirmDelete(null);
      await load();
    } catch (err) { push(err.message, "error"); }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-gold-600">Admin</p>
          <h1 className="mt-1 font-display text-3xl text-plum-800">Users</h1>
        </div>
        <button type="button" className={btnPrimary} onClick={() => setShowAdd(true)}>
          Add user
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-cream-50 text-ink-400">
            <tr>
              <th className="px-4 py-3 font-medium">Username</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-cream-200">
                <td className="px-4 py-3 font-medium">{u.username} {u.id === me?.id && <span className="text-xs text-ink-400">(you)</span>}</td>
                <td className="px-4 py-3 capitalize">{u.role}</td>
                <td className="px-4 py-3 text-ink-500">{new Date(u.created_at).toLocaleDateString("en-GB")}</td>
                <td className="px-4 py-3">
                  {u.id !== me?.id && (
                    <button type="button" className="text-rose-700 text-sm hover:underline" onClick={() => setConfirmDelete(u)}>Delete</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <p className="px-4 py-8 text-center text-ink-500">No users found.</p>}
      </div>

      {showAdd && (
        <Modal title="Add user" onClose={() => setShowAdd(false)}>
          <form className="grid gap-3" onSubmit={addUser}>
            <Field label="Username">
              <input className={inputClass} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </Field>
            <Field label="Password" hint="Minimum 6 characters">
              <input type="password" className={inputClass} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
            <Field label="Role">
              <select className={inputClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="cashier">Cashier</option>
                <option value="admin">Admin</option>
              </select>
            </Field>
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setShowAdd(false)}>Cancel</button>
              <button type="submit" className={btnPrimary} disabled={saving}>{saving ? "Saving…" : "Add user"}</button>
            </div>
          </form>
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Delete user" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm">Delete <strong>{confirmDelete.username}</strong>? They will no longer be able to sign in.</p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setConfirmDelete(null)}>Cancel</button>
            <button type="button" className={`${btnPrimary} bg-rose-700 hover:bg-rose-800`} onClick={deleteUser}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
