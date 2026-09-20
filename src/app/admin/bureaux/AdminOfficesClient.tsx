"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Save, X, Download } from "lucide-react";

type Wilaya = { id: string; code: string; nameFr: string; nameAr: string };

type Office = {
  id: string;
  wilayaId: string;
  nameFr: string;
  nameAr: string;
  active: boolean;
  wilaya: Wilaya;
};

const emptyForm = { wilayaId: "", nameFr: "", nameAr: "" };

export default function AdminOfficesClient() {
  const [offices, setOffices] = useState<Office[]>([]);
  const [wilayas, setWilayas] = useState<Wilaya[]>([]);
  const [filterWilaya, setFilterWilaya] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ nameFr: "", nameAr: "" });
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const load = () => {
    fetch("/api/admin/wilayas")
      .then((r) => r.json())
      .then(setWilayas);
    const url = filterWilaya
      ? `/api/admin/delivery-offices?wilayaId=${filterWilaya}`
      : "/api/admin/delivery-offices";
    fetch(url)
      .then((r) => r.json())
      .then(setOffices);
  };

  useEffect(() => {
    load();
  }, [filterWilaya]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/admin/delivery-offices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm(emptyForm);
    setShowForm(false);
    load();
  };

  const startEdit = (office: Office) => {
    setEditing(office.id);
    setEditForm({ nameFr: office.nameFr, nameAr: office.nameAr });
  };

  const saveEdit = async (id: string) => {
    await fetch(`/api/admin/delivery-offices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setEditing(null);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce bureau ?")) return;
    await fetch(`/api/admin/delivery-offices/${id}`, { method: "DELETE" });
    load();
  };

  const syncFromWorldExpress = async () => {
    if (!confirm("Importer les bureaux (et tarifs) depuis World Express ?")) return;
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/admin/world-express/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncFees: true, syncOffices: true }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      setSyncMsg(data.message || data.error || "Import terminé");
      load();
    } catch {
      setSyncMsg("Erreur réseau pendant l’import");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold admin-page-title">Bureaux de livraison</h1>
          <p className="admin-muted mt-1 text-sm">
            Gérez les points de retrait, ou importez-les depuis World Express si l’API les expose.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={syncFromWorldExpress}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-xl border border-[#b8956a]/40 bg-white px-5 py-2.5 text-sm font-semibold text-[#8b6914] disabled:opacity-50"
          >
            <Download size={18} />
            {syncing ? "Import…" : "Importer World Express"}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowForm(true);
              setForm(emptyForm);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#b8956a] to-[#8b6914] px-5 py-2.5 text-sm font-semibold text-white shadow-md"
          >
            <Plus size={18} />
            Ajouter un bureau
          </button>
        </div>
      </div>
      {syncMsg && (
        <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
          {syncMsg}
        </p>
      )}

      <div className="mb-4">
        <label className="mb-1 block text-sm font-semibold text-slate-300">Filtrer par wilaya</label>
        <select
          value={filterWilaya}
          onChange={(e) => setFilterWilaya(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
        >
          <option value="">Toutes les wilayas</option>
          {wilayas.map((w) => (
            <option key={w.id} value={w.id}>
              {w.code} — {w.nameFr}
            </option>
          ))}
        </select>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="admin-card mb-6 rounded-xl p-5">
          <h2 className="mb-4 font-semibold text-slate-900">Nouveau bureau</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-semibold">Wilaya</label>
              <select
                required
                value={form.wilayaId}
                onChange={(e) => setForm({ ...form, wilayaId: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Choisir…</option>
                {wilayas.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} — {w.nameFr}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Nom (FR)</label>
              <input
                required
                value={form.nameFr}
                onChange={(e) => setForm({ ...form, nameFr: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Bureau Alger — Hydra"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Nom (AR)</label>
              <input
                value={form.nameAr}
                onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                dir="rtl"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" className="admin-btn-primary px-5 py-2">
              Créer
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="admin-btn-secondary px-5 py-2">
              Annuler
            </button>
          </div>
        </form>
      )}

      <div className="admin-card overflow-x-auto rounded-xl">
        <table className="w-full text-sm text-slate-900">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-4 py-3 text-left">Wilaya</th>
              <th className="px-4 py-3 text-left">Nom (FR)</th>
              <th className="px-4 py-3 text-left">Nom (AR)</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {offices.map((office) => (
              <tr key={office.id} className="border-t">
                <td className="px-4 py-3">
                  {office.wilaya.code} — {office.wilaya.nameFr}
                </td>
                <td className="px-4 py-3">
                  {editing === office.id ? (
                    <input
                      value={editForm.nameFr}
                      onChange={(e) => setEditForm({ ...editForm, nameFr: e.target.value })}
                      className="w-full rounded border px-2 py-1"
                    />
                  ) : (
                    office.nameFr
                  )}
                </td>
                <td className="px-4 py-3">
                  {editing === office.id ? (
                    <input
                      value={editForm.nameAr}
                      onChange={(e) => setEditForm({ ...editForm, nameAr: e.target.value })}
                      className="w-full rounded border px-2 py-1"
                      dir="rtl"
                    />
                  ) : (
                    office.nameAr
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {editing === office.id ? (
                      <>
                        <button type="button" onClick={() => saveEdit(office.id)} className="text-green-600">
                          <Save size={16} />
                        </button>
                        <button type="button" onClick={() => setEditing(null)} className="text-slate-500">
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => startEdit(office)} className="text-[#b8956a]">
                          <Pencil size={16} />
                        </button>
                        <button type="button" onClick={() => handleDelete(office.id)} className="text-red-500">
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {offices.length === 0 && (
          <p className="py-12 text-center admin-muted">Aucun bureau trouvé</p>
        )}
      </div>
    </div>
  );
}
