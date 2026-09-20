"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Plus, Trash2, Loader2, Upload, RefreshCw } from "lucide-react";
import { parseJsonArray } from "@/lib/utils";

export type ImageFormRow = { id: string; url: string };

export function createEmptyImageRow(): ImageFormRow {
  return { id: crypto.randomUUID(), url: "" };
}

export function imagesFromJson(value: string): ImageFormRow[] {
  const urls = parseJsonArray(value);
  if (urls.length === 0) return [];
  return urls.map((url) => ({ id: crypto.randomUUID(), url }));
}

export function imagesToPayload(rows: ImageFormRow[]): string[] {
  return rows.map((row) => row.url.trim()).filter(Boolean);
}

async function uploadProductFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/products/upload", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Upload impossible");
  if (typeof data.url !== "string" || !data.url) throw new Error("Image manquante après upload");
  return data.url;
}

type AdminImageFieldsProps = {
  images: ImageFormRow[];
  onChange: (images: ImageFormRow[]) => void;
};

export function AdminImageFields({ images, onChange }: AdminImageFieldsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [replacingId, setReplacingId] = useState<string | null>(null);

  const removeRow = (id: string) => {
    onChange(images.filter((row) => row.id !== id));
  };

  const handleFiles = async (fileList: FileList | null, replaceId?: string) => {
    if (!fileList?.length) return;
    setError("");
    setUploading(true);

    try {
      const files = Array.from(fileList);
      const urls: string[] = [];
      for (const file of files) {
        urls.push(await uploadProductFile(file));
      }

      if (replaceId) {
        const url = urls[0];
        if (url) {
          onChange(images.map((row) => (row.id === replaceId ? { ...row, url } : row)));
        }
      } else {
        const newRows = urls.map((url) => ({ id: crypto.randomUUID(), url }));
        onChange([...images, ...newRows]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur upload");
    } finally {
      setUploading(false);
      setReplacingId(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="sm:col-span-2">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <label className="block text-sm font-semibold text-slate-800">Images du produit</label>
          <p className="mt-0.5 text-xs text-slate-500">
            Téléversez une ou plusieurs photos depuis votre PC ou téléphone.
          </p>
        </div>
        <button
          type="button"
          disabled={uploading}
          onClick={() => {
            setReplacingId(null);
            inputRef.current?.click();
          }}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#b8956a] to-[#8b6914] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-[#b8956a]/25 transition hover:brightness-110 disabled:opacity-50"
        >
          {uploading && !replacingId ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Plus size={16} />
          )}
          Ajouter des images
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple={!replacingId}
        className="sr-only"
        disabled={uploading}
        onChange={(e) => handleFiles(e.target.files, replacingId ?? undefined)}
      />

      {images.length === 0 ? (
        <button
          type="button"
          disabled={uploading}
          onClick={() => {
            setReplacingId(null);
            inputRef.current?.click();
          }}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center transition hover:border-[#b8956a]/50 hover:bg-[#b8956a]/5 disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 size={28} className="animate-spin text-[#b8956a]" />
          ) : (
            <Upload size={28} className="text-[#b8956a]" />
          )}
          <p className="text-sm font-medium text-slate-700">
            {uploading ? "Téléversement…" : "Choisir des images"}
          </p>
          <p className="text-xs text-slate-500">JPG, PNG, WEBP, GIF — max 5 Mo chacune</p>
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images.map((row, index) => (
            <div
              key={row.id}
              className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
            >
              {row.url ? (
                <Image
                  src={row.url}
                  alt={`Image ${index + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                  sizes="160px"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-300">
                  <Upload size={24} />
                </div>
              )}
              <div className="absolute left-2 top-2 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-bold text-[#f3e6c4]">
                {index + 1}
              </div>
              {uploading && replacingId === row.id && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                  <Loader2 className="animate-spin text-[#e4cf9a]" size={24} />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 flex gap-1 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => {
                    setReplacingId(row.id);
                    inputRef.current?.click();
                  }}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-white/95 px-2 py-1.5 text-[10px] font-semibold text-slate-800"
                >
                  <RefreshCw size={12} />
                  Remplacer
                </button>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => removeRow(row.id)}
                  className="inline-flex items-center justify-center rounded-md bg-red-500 px-2 py-1.5 text-white"
                  aria-label="Supprimer cette image"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            disabled={uploading}
            onClick={() => {
              setReplacingId(null);
              inputRef.current?.click();
            }}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-500 transition hover:border-[#b8956a]/50 hover:text-[#b8956a] disabled:opacity-50"
          >
            <Plus size={22} />
            <span className="text-[11px] font-medium">Ajouter</span>
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
