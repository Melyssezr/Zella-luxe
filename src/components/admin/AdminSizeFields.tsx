"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { parseJsonArray } from "@/lib/utils";

const FOOTWEAR_SIZES = ["35", "36", "37", "38", "39", "40", "41", "Unique"];
const LUGGAGE_SIZES = ["Cabine", "Moyenne", "Grande", "Unique"];
const ACCESSORY_SIZES = ["Unique", "PM", "MM", "GM"];

export function getSizeOptionsForCategory(category: string): string[] {
  if (category === "VALISES") return LUGGAGE_SIZES;
  if (category === "SACS" || category === "POCHETTES" || category === "LUNETTES") {
    return ACCESSORY_SIZES;
  }
  return FOOTWEAR_SIZES;
}

export function sizesFromJson(value: string): string[] {
  const parsed = parseJsonArray(value);
  return parsed.length > 0 ? parsed : ["Unique"];
}

type AdminSizeFieldsProps = {
  sizes: string[];
  category: string;
  onChange: (sizes: string[]) => void;
};

export function AdminSizeFields({ sizes, category, onChange }: AdminSizeFieldsProps) {
  const [pick, setPick] = useState("");
  const options = getSizeOptionsForCategory(category);
  const available = options.filter((size) => !sizes.includes(size));

  const addSize = () => {
    if (!pick || sizes.includes(pick)) return;
    onChange([...sizes, pick]);
    setPick("");
  };

  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-slate-800">Tailles</label>
      <p className="mb-2 text-xs text-slate-500">Choisissez les tailles disponibles dans la liste.</p>

      <div className="flex gap-2">
        <select
          value={pick}
          onChange={(e) => setPick(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
        >
          <option value="">Choisir une taille…</option>
          {available.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={addSize}
          disabled={!pick}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#b8956a] to-[#8b6914] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-[#b8956a]/25 transition hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100"
        >
          <Plus size={16} />
          Ajouter
        </button>
      </div>

      {sizes.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {sizes.map((size) => (
            <span
              key={size}
              className="inline-flex items-center gap-1 rounded-full border border-[#b8956a]/40 bg-[#b8956a]/10 px-3 py-1 text-sm font-medium text-[#8b6914]"
            >
              {size}
              <button
                type="button"
                onClick={() => onChange(sizes.filter((s) => s !== size))}
                className="rounded-full p-0.5 transition hover:bg-[#b8956a]/20"
                aria-label={`Retirer la taille ${size}`}
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-amber-700">Ajoutez au moins une taille.</p>
      )}
    </div>
  );
}
