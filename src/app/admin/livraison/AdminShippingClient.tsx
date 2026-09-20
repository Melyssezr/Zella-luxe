"use client";

import { useEffect, useState } from "react";
import { Download, Save } from "lucide-react";

type Wilaya = {
  id: string;
  code: string;
  nameFr: string;
  nameAr: string;
  homeShippingPrice: number;
  officeShippingPrice: number;
  active: boolean;
  _count: { offices: number };
};

export default function AdminShippingClient() {
  const [wilayas, setWilayas] = useState<Wilaya[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { home: string; office: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const load = () =>
    fetch("/api/admin/wilayas")
      .then((r) => r.json())
      .then((data: Wilaya[]) => {
        setWilayas(data);
        const next: Record<string, { home: string; office: string }> = {};
        data.forEach((w) => {
          next[w.id] = {
            home: String(w.homeShippingPrice),
            office: String(w.officeShippingPrice),
          };
        });
        setDrafts(next);
      });

  useEffect(() => {
    load();
  }, []);

  const save = async (id: string) => {
    const draft = drafts[id];
    if (!draft) return;
    setSaving(id);
    await fetch(`/api/admin/wilayas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        homeShippingPrice: parseFloat(draft.home),
        officeShippingPrice: parseFloat(draft.office),
      }),
    });
    setSaving(null);
    load();
  };

  const syncFromWorldExpress = async () => {
    if (
      !confirm(
        "Importer les tarifs (et bureaux si disponibles) depuis World Express ?\nCela remplacera les prix actuels par wilaya."
      )
    ) {
      return;
    }
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/admin/world-express/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncFees: true, syncOffices: true }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
        fees?: { updated?: number; error?: string | null };
        offices?: { created?: number; updated?: number; error?: string | null };
      };
      if (!res.ok) {
        setSyncMsg(data.error || "Échec de l’import");
      } else {
        setSyncMsg(data.message || "Import terminé");
        load();
      }
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
          <h1 className="mb-2 text-2xl font-bold admin-page-title">Tarifs de livraison</h1>
          <p className="admin-muted text-sm">
            Modifiez les prix manuellement, ou importez-les depuis World Express en un clic.
          </p>
        </div>
        <button
          type="button"
          onClick={syncFromWorldExpress}
          disabled={syncing}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#b8956a] to-[#8b6914] px-5 py-2.5 text-sm font-semibold text-white shadow-md disabled:opacity-50"
        >
          <Download size={18} />
          {syncing ? "Import…" : "Importer World Express"}
        </button>
      </div>
      {syncMsg && (
        <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
          {syncMsg}
        </p>
      )}

      <div className="admin-card overflow-x-auto rounded-xl">
        <table className="w-full text-sm text-slate-900">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-4 py-3 text-left">Wilaya</th>
              <th className="px-4 py-3 text-left">À domicile (DA)</th>
              <th className="px-4 py-3 text-left">Aux bureaux (DA)</th>
              <th className="px-4 py-3 text-left">Bureaux</th>
              <th className="px-4 py-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {wilayas.map((w) => (
              <tr key={w.id} className="border-t">
                <td className="px-4 py-3 font-medium">
                  {w.code} — {w.nameFr}
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={drafts[w.id]?.home ?? ""}
                    onChange={(e) =>
                      setDrafts({ ...drafts, [w.id]: { ...drafts[w.id], home: e.target.value } })
                    }
                    className="w-28 rounded-lg border border-slate-300 px-2 py-1.5"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={drafts[w.id]?.office ?? ""}
                    onChange={(e) =>
                      setDrafts({ ...drafts, [w.id]: { ...drafts[w.id], office: e.target.value } })
                    }
                    className="w-28 rounded-lg border border-slate-300 px-2 py-1.5"
                  />
                </td>
                <td className="px-4 py-3 admin-muted">{w._count.offices}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => save(w.id)}
                    disabled={saving === w.id}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#b8956a] px-3 py-1.5 text-xs text-white disabled:opacity-50"
                  >
                    <Save size={14} />
                    {saving === w.id ? "…" : "Enregistrer"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
