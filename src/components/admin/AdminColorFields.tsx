"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Plus, Trash2, Loader2, Upload, RefreshCw } from "lucide-react";
import { normalizeHex, parseJsonColors, type ProductColor } from "@/lib/utils";

export type ColorFormRow = ProductColor & { id: string };

export function createEmptyColorRow(): ColorFormRow {
  return {
    id: crypto.randomUUID(),
    nameFr: "",
    nameAr: "",
    hex: "#000000",
    image: "",
  };
}

export function colorsFromJson(value: string): ColorFormRow[] {
  const parsed = parseJsonColors(value);
  if (parsed.length === 0) return [];
  return parsed.map((color) => ({
    id: crypto.randomUUID(),
    nameFr: color.nameFr,
    nameAr: color.nameAr,
    hex: color.hex ?? "#888888",
    image: color.image ?? "",
  }));
}

export function colorsToPayload(rows: ColorFormRow[]): ProductColor[] {
  return rows
    .filter((row) => row.nameFr.trim())
    .map(({ nameFr, nameAr, hex, image }) => ({
      nameFr: nameFr.trim(),
      nameAr: nameAr.trim() || nameFr.trim(),
      hex: normalizeHex(hex ?? "#888888"),
      ...((image ?? "").trim() ? { image: (image ?? "").trim() } : {}),
    }));
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

type AdminColorFieldsProps = {
  colors: ColorFormRow[];
  onChange: (colors: ColorFormRow[]) => void;
};

function ColorImageUpload({
  image,
  onChange,
}: {
  image: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const url = await uploadProductFile(file);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur upload");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">Photo (optionnel)</label>
      <div className="flex items-center gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {image ? (
            <Image src={image} alt="" fill className="object-cover" unoptimized sizes="56px" />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-300">
              <Upload size={16} />
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Loader2 size={16} className="animate-spin text-white" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-[#b8956a]/50 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : image ? (
              <RefreshCw size={12} />
            ) : (
              <Upload size={12} />
            )}
            {image ? "Remplacer" : "Choisir une image"}
          </button>
          {image && (
            <button
              type="button"
              disabled={uploading}
              onClick={() => onChange("")}
              className="ml-2 text-xs text-red-600 hover:underline"
            >
              Retirer
            </button>
          )}
          {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}

export function AdminColorFields({ colors, onChange }: AdminColorFieldsProps) {
  const updateRow = (id: string, patch: Partial<ColorFormRow>) => {
    onChange(colors.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const removeRow = (id: string) => {
    onChange(colors.filter((row) => row.id !== id));
  };

  const addRow = () => {
    onChange([...colors, createEmptyColorRow()]);
  };

  return (
    <div className="sm:col-span-2">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <label className="block text-sm font-semibold text-slate-800">Couleurs</label>
          <p className="mt-0.5 text-xs text-slate-500">
            Ajoutez les couleurs disponibles avec un nom, une teinte et une photo optionnelle.
          </p>
        </div>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#b8956a] to-[#8b6914] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-[#b8956a]/25 transition hover:brightness-110"
        >
          <Plus size={16} />
          Ajouter une couleur
        </button>
      </div>

      {colors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
          <p className="text-sm text-slate-500">Aucune couleur définie.</p>
          <button
            type="button"
            onClick={addRow}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#b8956a] to-[#8b6914] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-[#b8956a]/25 transition hover:brightness-110"
          >
            <Plus size={16} />
            Ajouter une couleur
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {colors.map((row, index) => (
            <div
              key={row.id}
              className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Couleur {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 transition hover:bg-red-50"
                  aria-label="Supprimer cette couleur"
                >
                  <Trash2 size={14} />
                  Supprimer
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-[auto_1fr_1fr]">
                <div className="flex flex-col items-center gap-2">
                  <div
                    className="h-12 w-12 shrink-0 rounded-full border-2 border-white shadow-md ring-1 ring-slate-200"
                    style={{ backgroundColor: normalizeHex(row.hex ?? "#888888") }}
                  />
                  <input
                    type="color"
                    value={normalizeHex(row.hex ?? "#000000")}
                    onChange={(e) => updateRow(row.id, { hex: e.target.value })}
                    className="h-9 w-12 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
                    aria-label="Choisir une couleur"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Nom (FR)</label>
                  <input
                    value={row.nameFr}
                    onChange={(e) => updateRow(row.id, { nameFr: e.target.value })}
                    placeholder="Ex. Noir, Blanc, Rouge"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Nom (AR)</label>
                  <input
                    value={row.nameAr}
                    onChange={(e) => updateRow(row.id, { nameAr: e.target.value })}
                    placeholder="Optionnel"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Code HEX</label>
                  <input
                    value={row.hex ?? ""}
                    onChange={(e) => updateRow(row.id, { hex: e.target.value })}
                    onBlur={() => updateRow(row.id, { hex: normalizeHex(row.hex ?? "#888888") })}
                    placeholder="#000000"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900"
                  />
                </div>
                <ColorImageUpload
                  image={row.image ?? ""}
                  onChange={(url) => updateRow(row.id, { image: url })}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
