"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Loader2,
  Eye,
  EyeOff,
  ArrowUpDown,
  ImageIcon,
  LayoutGrid,
  Upload,
  RefreshCw,
} from "lucide-react";
import type { CatalogRecord } from "@/lib/categories";
import { catalogCoverImage } from "@/lib/categories";

type Draft = {
  nameFr: string;
  nameAr: string;
  coverImage: string;
  accentColor: string;
  sortOrder: string;
  active: boolean;
};

function toDraft(catalog: CatalogRecord): Draft {
  return {
    nameFr: catalog.nameFr,
    nameAr: catalog.nameAr,
    coverImage: catalog.coverImage,
    accentColor: catalog.accentColor || "#c9a86c",
    sortOrder: String(catalog.sortOrder),
    active: catalog.active,
  };
}

async function uploadCatalogFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/catalogs/upload", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Upload impossible");
  if (typeof data.url !== "string" || !data.url) throw new Error("Image manquante après upload");
  return data.url;
}

function CatalogImageUploader({
  previewUrl,
  onUploaded,
  disabled,
}: {
  previewUrl: string;
  onUploaded: (url: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const display = localPreview || previewUrl;

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    const objectUrl = URL.createObjectURL(file);
    setLocalPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return objectUrl;
    });

    setUploading(true);
    try {
      const url = await uploadCatalogFile(file);
      onUploaded(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur upload");
      setLocalPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="sm:col-span-2">
      <label className="admin-field-label">Image de catégorie</label>
      <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <div className="relative mx-auto aspect-square w-full max-w-[160px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50 sm:mx-0">
          {display ? (
            <Image src={display} alt="Aperçu" fill className="object-cover" unoptimized sizes="160px" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
              <ImageIcon size={28} />
              <span className="text-[11px]">Aperçu</span>
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/45">
              <Loader2 className="animate-spin text-[#e4cf9a]" size={28} />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col justify-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            disabled={disabled || uploading}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#e4cf9a] via-[#c9a86c] to-[#a07d3e] px-4 py-2.5 text-sm font-semibold text-[#1a130a] transition hover:brightness-105 disabled:opacity-50"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : display ? <RefreshCw size={16} /> : <Upload size={16} />}
            {uploading ? "Téléversement…" : display ? "Remplacer l'image" : "Choisir une image"}
          </button>
          <p className="text-[11px] text-slate-500">
            JPG, PNG, WEBP ou GIF — max 5 Mo. Depuis votre PC ou téléphone.
          </p>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}

function CatalogCard({
  catalog,
  editing,
  onStartEdit,
  onCancelEdit,
  onSaved,
  onDeleted,
  onToggled,
}: {
  catalog: CatalogRecord;
  editing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaved: (updated: CatalogRecord) => void;
  onDeleted: (id: string) => void;
  onToggled: (updated: CatalogRecord) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(catalog));
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editing) {
      setDraft(toDraft(catalog));
      setError("");
    }
  }, [editing, catalog]);

  const cover = catalogCoverImage({
    slug: catalog.slug,
    coverImage: editing ? draft.coverImage : catalog.coverImage,
  });
  const accent = editing ? draft.accentColor : catalog.accentColor || "#c9a86c";

  const patchCatalog = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/catalogs/${catalog.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Enregistrement impossible");
    return data as CatalogRecord;
  };

  const handleSave = async () => {
    if (!draft.nameFr.trim() || !draft.nameAr.trim()) {
      setError("Les noms FR et AR sont requis.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const updated = await patchCatalog({
        nameFr: draft.nameFr.trim(),
        nameAr: draft.nameAr.trim(),
        coverImage: draft.coverImage.trim(),
        accentColor: draft.accentColor,
        sortOrder: Number.parseInt(draft.sortOrder, 10) || 0,
        active: draft.active,
      });
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUploaded = async (url: string) => {
    setDraft((d) => ({ ...d, coverImage: url }));
    // Associate immediately so the image is saved even before clicking Enregistrer.
    try {
      const updated = await patchCatalog({ coverImage: url });
      onToggled(updated);
    } catch {
      /* draft keeps the URL; user can still click Enregistrer */
    }
  };

  const handleToggleActive = async () => {
    setToggling(true);
    setError("");
    try {
      const updated = await patchCatalog({ active: !catalog.active });
      onToggled(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Supprimer la catégorie « ${catalog.nameFr} » ?`)) return;
    const res = await fetch(`/api/admin/catalogs/${catalog.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || "Suppression impossible");
      return;
    }
    onDeleted(catalog.id);
  };

  return (
    <article
      className={`admin-card group overflow-hidden rounded-2xl transition ${
        editing ? "ring-2 ring-[#b8956a]/45" : "hover:shadow-md"
      }`}
      style={{ borderTop: `3px solid ${accent}` }}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {cover ? (
          <Image
            src={cover}
            alt={catalog.nameFr}
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300">
            <ImageIcon size={40} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/25" />

        <div className="admin-card-overlay absolute inset-0">
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            <span
              className={`admin-overlay-badge rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm ${
                catalog.active
                  ? "admin-overlay-badge-active bg-emerald-500/95"
                  : "bg-black/65 ring-1 ring-[#e4cf9a]/45"
              }`}
            >
              {catalog.active ? "Active" : "Inactive"}
            </span>
            <span className="admin-overlay-badge rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-[#e4cf9a]/40 backdrop-blur-sm">
              Ordre {catalog.sortOrder}
            </span>
            <span
              className="admin-overlay-badge inline-flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ring-1 backdrop-blur-sm"
              style={{ boxShadow: `inset 0 0 0 1px ${accent}66` }}
              title={`Accent ${accent}`}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-white/40"
                style={{ backgroundColor: accent }}
              />
              Accent
            </span>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-4">
            <span
              className="mb-2 block h-0.5 w-10 rounded-full"
              style={{ backgroundColor: accent }}
            />
            <p
              className="admin-overlay-muted text-[10px] font-semibold uppercase tracking-[0.2em]"
              style={{ textShadow: "0 2px 10px rgba(0,0,0,0.95)" }}
            >
              {catalog.slug}
            </p>
            <h2
              className="font-display mt-1 text-xl font-semibold"
              style={{ textShadow: "0 2px 14px rgba(0,0,0,0.95), 0 0 18px rgba(201,168,108,0.4)" }}
            >
              {editing ? draft.nameFr || "Sans nom" : catalog.nameFr}
            </h2>
            <p
              className="admin-overlay-muted mt-0.5 text-sm"
              dir="rtl"
              lang="ar"
              style={{ textShadow: "0 2px 10px rgba(0,0,0,0.95)" }}
            >
              {editing ? draft.nameAr : catalog.nameAr}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {!editing ? (
          <>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onStartEdit}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#b8956a] px-3 py-2 text-xs font-semibold text-white transition hover:brightness-105 sm:flex-none"
              >
                <Pencil size={14} />
                Modifier
              </button>
              <button
                type="button"
                onClick={handleToggleActive}
                disabled={toggling}
                className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition sm:flex-none ${
                  catalog.active
                    ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                {toggling ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : catalog.active ? (
                  <EyeOff size={14} />
                ) : (
                  <Eye size={14} />
                )}
                {catalog.active ? "Désactiver" : "Activer"}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100"
              >
                <Trash2 size={14} />
                Supprimer
              </button>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="admin-field-label">Nom (FR)</label>
                <input
                  value={draft.nameFr}
                  onChange={(e) => setDraft({ ...draft, nameFr: e.target.value })}
                  className="admin-field-input"
                  required
                />
              </div>
              <div>
                <label className="admin-field-label">Nom (AR)</label>
                <input
                  dir="rtl"
                  lang="ar"
                  value={draft.nameAr}
                  onChange={(e) => setDraft({ ...draft, nameAr: e.target.value })}
                  className="admin-field-input"
                  required
                />
              </div>

              <CatalogImageUploader
                previewUrl={
                  draft.coverImage
                    ? catalogCoverImage({ slug: catalog.slug, coverImage: draft.coverImage })
                    : ""
                }
                onUploaded={handleImageUploaded}
                disabled={saving}
              />

              <div>
                <label className="admin-field-label inline-flex items-center gap-1">
                  <ArrowUpDown size={12} /> Ordre d&apos;affichage
                </label>
                <input
                  type="number"
                  min={0}
                  value={draft.sortOrder}
                  onChange={(e) => setDraft({ ...draft, sortOrder: e.target.value })}
                  className="admin-field-input"
                />
              </div>
              <div>
                <label className="admin-field-label">Couleur d&apos;accent</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={draft.accentColor}
                    onChange={(e) => setDraft({ ...draft, accentColor: e.target.value })}
                    className="h-10 w-14 cursor-pointer rounded-lg border border-slate-300 bg-white p-0.5"
                    aria-label="Choisir la couleur d'accent"
                  />
                  <div
                    className="flex h-10 flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700"
                    style={{ background: `${accent}14` }}
                  >
                    <span
                      className="h-4 w-4 shrink-0 rounded-full ring-1 ring-black/10"
                      style={{ backgroundColor: accent }}
                    />
                    <span className="font-mono uppercase">{accent}</span>
                  </div>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Visible sur la carte, les badges produits et l&apos;accueil.
                </p>
              </div>
              <label className="flex items-center gap-2 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm font-medium text-slate-700">
                  Catégorie active (visible sur le site)
                </span>
              </label>
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="admin-btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Enregistrer
              </button>
              <button
                type="button"
                onClick={onCancelEdit}
                disabled={saving}
                className="admin-btn-secondary inline-flex items-center gap-1.5 px-4 py-2 text-xs"
              >
                <X size={14} />
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

export default function AdminCatalogsClient() {
  const [catalogs, setCatalogs] = useState<CatalogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [newCatalog, setNewCatalog] = useState({
    nameFr: "",
    nameAr: "",
    coverImage: "",
    sortOrder: "",
  });

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/catalogs");
      const data = await res.json();
      setCatalogs(Array.isArray(data) ? data : []);
    } catch {
      setCatalogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sorted = useMemo(
    () => [...catalogs].sort((a, b) => a.sortOrder - b.sortOrder || a.nameFr.localeCompare(b.nameFr)),
    [catalogs]
  );

  const upsert = (updated: CatalogRecord) => {
    setCatalogs((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/admin/catalogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameFr: newCatalog.nameFr.trim(),
          nameAr: newCatalog.nameAr.trim(),
          coverImage: newCatalog.coverImage.trim(),
          sortOrder: newCatalog.sortOrder ? Number.parseInt(newCatalog.sortOrder, 10) : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Création impossible");
      setNewCatalog({ nameFr: "", nameAr: "", coverImage: "", sortOrder: "" });
      setShowCreate(false);
      await load();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <div className="admin-page-header mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="admin-page-badge">Catalogue</span>
          <h1 className="font-display mt-2 text-2xl font-bold admin-page-title md:text-3xl">
            Catégories
          </h1>
          <p className="admin-page-subtitle mt-1 text-sm">
            Cartes interactives — image par téléversement, modification directe sans changer de page.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowCreate((v) => !v);
            setCreateError("");
          }}
          className="admin-btn-accent inline-flex items-center gap-2 px-5 py-2.5"
        >
          <Plus size={18} />
          Ajouter une catégorie
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="admin-card mb-8 rounded-2xl border border-[#b8956a]/25 p-5 sm:p-6"
        >
          <div className="mb-4 flex items-center gap-2">
            <LayoutGrid size={18} className="text-[#b8956a]" />
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Nouvelle catégorie
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="admin-field-label">Nom (FR)</label>
              <input
                value={newCatalog.nameFr}
                onChange={(e) => setNewCatalog({ ...newCatalog, nameFr: e.target.value })}
                className="admin-field-input"
                required
              />
            </div>
            <div>
              <label className="admin-field-label">Nom (AR)</label>
              <input
                dir="rtl"
                lang="ar"
                value={newCatalog.nameAr}
                onChange={(e) => setNewCatalog({ ...newCatalog, nameAr: e.target.value })}
                className="admin-field-input"
                required
              />
            </div>

            <CatalogImageUploader
              previewUrl={newCatalog.coverImage}
              onUploaded={(url) => setNewCatalog((c) => ({ ...c, coverImage: url }))}
              disabled={creating}
            />

            <div>
              <label className="admin-field-label">Ordre d&apos;affichage (optionnel)</label>
              <input
                type="number"
                min={0}
                value={newCatalog.sortOrder}
                onChange={(e) => setNewCatalog({ ...newCatalog, sortOrder: e.target.value })}
                placeholder="Auto"
                className="admin-field-input"
              />
            </div>
          </div>
          {createError && <p className="mt-3 text-sm text-red-600">{createError}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="submit" disabled={creating} className="admin-btn-primary px-5 py-2.5 text-sm">
              {creating ? "Création…" : "Créer la catégorie"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="admin-btn-secondary px-5 py-2.5 text-sm"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="admin-card flex items-center justify-center gap-2 rounded-2xl py-16 text-slate-500">
          <Loader2 className="animate-spin" size={20} />
          Chargement des catégories…
        </div>
      ) : sorted.length === 0 ? (
        <div className="admin-card rounded-2xl px-6 py-14 text-center">
          <LayoutGrid size={36} className="mx-auto text-[#b8956a]" />
          <h2 className="font-display mt-4 text-lg font-semibold text-slate-900">
            Aucune catégorie
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Créez votre première catégorie pour organiser le catalogue.
          </p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="admin-btn-accent mt-6 inline-flex items-center gap-2 px-5 py-2.5"
          >
            <Plus size={16} />
            Ajouter une catégorie
          </button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((catalog) => (
            <CatalogCard
              key={catalog.id}
              catalog={catalog}
              editing={editingId === catalog.id}
              onStartEdit={() => setEditingId(catalog.id)}
              onCancelEdit={() => setEditingId(null)}
              onSaved={(updated) => {
                upsert(updated);
                setEditingId(null);
              }}
              onToggled={upsert}
              onDeleted={(id) => {
                setCatalogs((prev) => prev.filter((c) => c.id !== id));
                if (editingId === id) setEditingId(null);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
