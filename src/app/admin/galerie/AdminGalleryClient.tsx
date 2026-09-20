"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Plus, Trash2, Loader2, Upload, X } from "lucide-react";

type GalleryImage = {
  id: string;
  url: string;
  captionFr: string | null;
  captionAr: string | null;
  sortOrder: number;
};

type PendingImage = {
  id: string;
  url: string;
  localPreview?: string;
};

async function uploadGalleryFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/gallery/upload", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Upload impossible");
  if (typeof data.url !== "string" || !data.url) throw new Error("Image manquante");
  return data.url;
}

export default function AdminGalleryClient() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [pending, setPending] = useState<PendingImage[]>([]);
  const [captionFr, setCaptionFr] = useState("");
  const [captionAr, setCaptionAr] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () =>
    fetch("/api/gallery")
      .then((r) => r.json())
      .then((data) => setImages(Array.isArray(data) ? data : []))
      .catch(() => setImages([]));

  useEffect(() => {
    load();
  }, []);

  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  useEffect(() => {
    return () => {
      pendingRef.current.forEach((p) => {
        if (p.localPreview) URL.revokeObjectURL(p.localPreview);
      });
    };
  }, []);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setError("");
    setUploading(true);

    try {
      const files = Array.from(fileList);
      const uploaded: PendingImage[] = [];

      for (const file of files) {
        const localPreview = URL.createObjectURL(file);
        const url = await uploadGalleryFile(file);
        uploaded.push({ id: crypto.randomUUID(), url, localPreview });
      }

      setPending((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur upload");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removePending = (id: string) => {
    setPending((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item?.localPreview) URL.revokeObjectURL(item.localPreview);
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending.length === 0) {
      setError("Ajoutez au moins une image.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      for (const [index, item] of pending.entries()) {
        const res = await fetch("/api/gallery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: item.url,
            captionFr: captionFr.trim() || null,
            captionAr: captionAr.trim() || null,
            sortOrder: images.length + index,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Enregistrement impossible");
      }

      pending.forEach((p) => {
        if (p.localPreview) URL.revokeObjectURL(p.localPreview);
      });
      setPending([]);
      setCaptionFr("");
      setCaptionAr("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette image ?")) return;
    await fetch(`/api/gallery/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div>
      <div className="admin-page-header mb-8">
        <span className="admin-page-badge">Médias</span>
        <h1 className="font-display mt-2 text-2xl font-bold admin-page-title md:text-3xl">
          Galerie
        </h1>
        <p className="admin-page-subtitle mt-1 text-sm">
          Téléversez une ou plusieurs photos depuis votre PC ou téléphone.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="admin-card mb-8 rounded-xl p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <label className="block text-sm font-semibold text-slate-800">Images</label>
            <p className="mt-0.5 text-xs text-slate-500">JPG, PNG, WEBP, GIF — max 5 Mo chacune</p>
          </div>
          <button
            type="button"
            disabled={uploading || saving}
            onClick={() => inputRef.current?.click()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#b8956a] to-[#8b6914] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-[#b8956a]/25 transition hover:brightness-110 disabled:opacity-50"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Ajouter des images
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="sr-only"
          disabled={uploading || saving}
          onChange={(e) => handleFiles(e.target.files)}
        />

        {pending.length === 0 ? (
          <button
            type="button"
            disabled={uploading || saving}
            onClick={() => inputRef.current?.click()}
            className="mb-4 flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center transition hover:border-[#b8956a]/50 hover:bg-[#b8956a]/5 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 size={28} className="animate-spin text-[#b8956a]" />
            ) : (
              <Upload size={28} className="text-[#b8956a]" />
            )}
            <p className="text-sm font-medium text-slate-700">
              {uploading ? "Téléversement…" : "Choisir des images"}
            </p>
          </button>
        ) : (
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {pending.map((item, index) => (
              <div
                key={item.id}
                className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
              >
                <Image
                  src={item.localPreview || item.url}
                  alt={`Aperçu ${index + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                  sizes="160px"
                />
                <div className="absolute left-2 top-2 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-bold text-[#f3e6c4]">
                  {index + 1}
                </div>
                <button
                  type="button"
                  disabled={uploading || saving}
                  onClick={() => removePending(item.id)}
                  className="absolute right-2 top-2 rounded-full bg-red-500 p-1.5 text-white shadow"
                  aria-label="Retirer cette image"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <button
              type="button"
              disabled={uploading || saving}
              onClick={() => inputRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-500 transition hover:border-[#b8956a]/50 hover:text-[#b8956a] disabled:opacity-50"
            >
              <Plus size={22} />
              <span className="text-[11px] font-medium">Ajouter</span>
            </button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-800">Légende FR</label>
            <input
              value={captionFr}
              onChange={(e) => setCaptionFr(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              placeholder="Optionnel — appliquée à toutes les images ajoutées"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-800">Légende AR</label>
            <input
              value={captionAr}
              onChange={(e) => setCaptionAr(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              placeholder="اختياري"
              dir="rtl"
            />
          </div>
        </div>

        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={uploading || saving || pending.length === 0}
          className="admin-btn-primary mt-4 inline-flex w-fit items-center gap-2 px-6 py-2.5 disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Enregistrer {pending.length > 0 ? `(${pending.length})` : ""}
        </button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((img) => (
          <div key={img.id} className="admin-card relative rounded-xl p-3">
            <div className="relative aspect-square overflow-hidden rounded-lg bg-slate-100">
              <Image
                src={img.url}
                alt={img.captionFr ?? ""}
                fill
                className="object-cover"
                unoptimized
                sizes="320px"
              />
            </div>
            <p className="mt-2 text-sm font-medium text-slate-800">{img.captionFr || "—"}</p>
            <button
              type="button"
              onClick={() => handleDelete(img.id)}
              className="absolute right-5 top-5 rounded-full bg-white p-1.5 text-red-500 shadow"
              aria-label="Supprimer"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
