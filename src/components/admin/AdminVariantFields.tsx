"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Plus, Trash2, Loader2, Upload, RefreshCw } from "lucide-react";
import { normalizeHex } from "@/lib/utils";
import {
  allSizesShareSamePrice,
  getProductVariants,
  sizeLabels,
  type ColorSizeStock,
  type ColorVariant,
  type ProductVariantsData,
} from "@/lib/variants";

export type SizeStockForm = ColorSizeStock & { id: string };
export type ColorVariantForm = Omit<ColorVariant, "sizes"> & {
  id: string;
  sizes: SizeStockForm[];
};

function newSizeStock(size = "", stock = 0): SizeStockForm {
  return { id: crypto.randomUUID(), size, stock };
}

function newColor(partial?: Partial<ColorVariant>): ColorVariantForm {
  return {
    id: crypto.randomUUID(),
    nameFr: partial?.nameFr ?? "",
    nameAr: partial?.nameAr ?? "",
    hex: partial?.hex ?? "#000000",
    image: partial?.image ?? "",
    sizes: (partial?.sizes ?? []).map((s) => newSizeStock(s.size, s.stock)),
  };
}

export function variantsFromProduct(product: {
  price: number;
  stock: number;
  sizes?: string | null;
  colors?: string | null;
  variants?: string | null;
}): { colors: ColorVariantForm[]; sizePrices: Record<string, number> } {
  const data = getProductVariants(product);
  if (data.colors.length === 0) {
    return {
      colors: [
        newColor({
          nameFr: "Standard",
          nameAr: "Standard",
          hex: "#888888",
          sizes: [{ size: "Unique", stock: 0 }],
        }),
      ],
      sizePrices: { Unique: product.price || 0 },
    };
  }
  return {
    colors: data.colors.map((c) => newColor(c)),
    sizePrices: { ...data.sizePrices },
  };
}

export function variantsToPayload(
  colors: ColorVariantForm[],
  sizePrices: Record<string, number>
): ProductVariantsData {
  const cleaned: ColorVariant[] = colors
    .filter((c) => c.nameFr.trim())
    .map(({ nameFr, nameAr, hex, image, sizes }) => ({
      nameFr: nameFr.trim(),
      nameAr: (nameAr.trim() || nameFr).trim(),
      hex: normalizeHex(hex ?? "#888888"),
      ...(image?.trim() ? { image: image.trim() } : {}),
      sizes: sizes
        .filter((s) => s.size.trim())
        .map(({ size, stock }) => ({
          size: size.trim(),
          stock: Math.max(0, Math.floor(stock) || 0),
        })),
    }))
    .filter((c) => c.sizes.length > 0);

  const prices: Record<string, number> = {};
  for (const c of cleaned) {
    for (const s of c.sizes) {
      if (!(s.size in prices)) {
        prices[s.size] = Number.isFinite(sizePrices[s.size])
          ? Math.max(0, sizePrices[s.size])
          : 0;
      }
    }
  }
  for (const [k, v] of Object.entries(sizePrices)) {
    if (k in prices && Number.isFinite(v)) prices[k] = Math.max(0, v);
  }

  return { v: 2, sizePrices: prices, colors: cleaned };
}

async function uploadProductFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/products/upload", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Upload impossible");
  if (typeof data.url !== "string" || !data.url) throw new Error("URL image manquante");
  return data.url;
}

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
      onChange(await uploadProductFile(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur upload");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        disabled={uploading}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
        {image ? (
          <Image src={image} alt="" fill className="object-cover" unoptimized sizes="48px" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300">
            <Upload size={16} />
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 size={14} className="animate-spin text-white" />
          </div>
        )}
      </div>
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700"
      >
        <RefreshCw size={12} />
        {image ? "Remplacer" : "Photo"}
      </button>
      {image && (
        <button type="button" onClick={() => onChange("")} className="text-[11px] text-red-600">
          Retirer
        </button>
      )}
      {error && <p className="w-full text-[10px] text-red-600">{error}</p>}
    </div>
  );
}

type AdminVariantFieldsProps = {
  colors: ColorVariantForm[];
  onColorsChange: (colors: ColorVariantForm[]) => void;
  sizePrices: Record<string, number>;
  onSizePricesChange: (prices: Record<string, number>) => void;
  useSinglePrice: boolean;
  onUseSinglePriceChange: (value: boolean) => void;
  singlePrice: string;
  onSinglePriceChange: (value: string) => void;
};

export function AdminVariantFields({
  colors,
  onColorsChange,
  sizePrices,
  onSizePricesChange,
  useSinglePrice,
  onUseSinglePriceChange,
  singlePrice,
  onSinglePriceChange,
}: AdminVariantFieldsProps) {
  const [newSizeLabel, setNewSizeLabel] = useState<Record<string, string>>({});
  const priceNum = parseFloat(singlePrice) || 0;

  const allSizes = useMemo(() => {
    const set = new Set<string>();
    for (const c of colors) {
      for (const s of c.sizes) {
        if (s.size.trim()) set.add(s.size.trim());
      }
    }
    for (const k of Object.keys(sizePrices)) {
      if (k.trim()) set.add(k.trim());
    }
    return [...set];
  }, [colors, sizePrices]);

  const updateColor = (id: string, patch: Partial<ColorVariantForm>) => {
    onColorsChange(colors.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const removeColor = (id: string) => {
    onColorsChange(colors.filter((c) => c.id !== id));
  };

  const addColor = () => {
    onColorsChange([
      ...colors,
      newColor({ nameFr: "", nameAr: "", hex: "#000000", sizes: [] }),
    ]);
  };

  const addSizeToColor = (colorId: string) => {
    const label = (newSizeLabel[colorId] ?? "").trim();
    if (!label) return;
    const color = colors.find((c) => c.id === colorId);
    if (!color) return;
    if (color.sizes.some((s) => s.size.trim().toLowerCase() === label.toLowerCase())) {
      alert("Cette taille existe déjà pour cette couleur.");
      return;
    }
    updateColor(colorId, {
      sizes: [...color.sizes, newSizeStock(label, 0)],
    });
    if (!(label in sizePrices)) {
      onSizePricesChange({ ...sizePrices, [label]: useSinglePrice ? priceNum : priceNum });
    }
    setNewSizeLabel((prev) => ({ ...prev, [colorId]: "" }));
  };

  const updateSizeStock = (colorId: string, sizeId: string, patch: Partial<SizeStockForm>) => {
    onColorsChange(
      colors.map((c) =>
        c.id !== colorId
          ? c
          : {
              ...c,
              sizes: c.sizes.map((s) => (s.id === sizeId ? { ...s, ...patch } : s)),
            }
      )
    );
  };

  const removeSizeFromColor = (colorId: string, sizeId: string) => {
    onColorsChange(
      colors.map((c) =>
        c.id !== colorId ? c : { ...c, sizes: c.sizes.filter((s) => s.id !== sizeId) }
      )
    );
  };

  const renameSizeEverywhere = (oldSize: string, newSize: string) => {
    const next = newSize.trim();
    if (!next || next === oldSize) return;
    onColorsChange(
      colors.map((c) => ({
        ...c,
        sizes: c.sizes.map((s) => (s.size === oldSize ? { ...s, size: next } : s)),
      }))
    );
    const prices = { ...sizePrices };
    if (oldSize in prices) {
      prices[next] = prices[oldSize];
      delete prices[oldSize];
    }
    onSizePricesChange(prices);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <input
            type="checkbox"
            checked={useSinglePrice}
            onChange={(e) => {
              const checked = e.target.checked;
              onUseSinglePriceChange(checked);
              if (checked) {
                const p = priceNum;
                const next: Record<string, number> = {};
                for (const size of allSizes) next[size] = p;
                onSizePricesChange(next);
              }
            }}
            className="rounded border-slate-300"
          />
          Prix unique pour toutes les tailles
        </label>
        <p className="mt-1 text-xs text-slate-500">
          Cochez si toutes les tailles ont le même prix. Sinon, fixez un prix par taille ci-dessous.
        </p>
        {useSinglePrice && (
          <div className="mt-3 max-w-xs">
            <label className="admin-field-label">Prix unique (DA)</label>
            <input
              type="number"
              min={0}
              step={1}
              value={singlePrice}
              onChange={(e) => {
                onSinglePriceChange(e.target.value);
                const p = parseFloat(e.target.value) || 0;
                const next: Record<string, number> = {};
                for (const size of allSizes) next[size] = p;
                onSizePricesChange(next);
              }}
              className="admin-field-input"
            />
          </div>
        )}
        {!useSinglePrice && allSizes.length > 0 && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {allSizes.map((size) => (
              <div key={size} className="rounded-lg border border-slate-200 bg-white p-3">
                <label className="text-[10px] font-semibold uppercase text-slate-500">
                  Prix — {size}
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={sizePrices[size] ?? ""}
                  onChange={(e) =>
                    onSizePricesChange({
                      ...sizePrices,
                      [size]: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="admin-field-input mt-1"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">Couleurs</p>
          <p className="text-xs text-slate-500">
            Ajoutez d’abord une couleur, puis les tailles disponibles avec leur stock.
          </p>
        </div>
        <button
          type="button"
          onClick={addColor}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#b8956a] to-[#8b6914] px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus size={16} />
          Couleur
        </button>
      </div>

      {colors.length === 0 ? (
        <p className="text-sm text-amber-700">Ajoutez au moins une couleur.</p>
      ) : (
        <div className="space-y-4">
          {colors.map((color, colorIndex) => (
            <div
              key={color.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-3 flex flex-wrap items-end gap-3">
                <div className="min-w-[8rem] flex-1">
                  <label className="admin-field-label">Couleur {colorIndex + 1} (FR)</label>
                  <input
                    value={color.nameFr}
                    onChange={(e) => updateColor(color.id, { nameFr: e.target.value })}
                    className="admin-field-input"
                    placeholder="Noir"
                  />
                </div>
                <div className="min-w-[8rem] flex-1">
                  <label className="admin-field-label">Nom AR</label>
                  <input
                    value={color.nameAr}
                    onChange={(e) => updateColor(color.id, { nameAr: e.target.value })}
                    className="admin-field-input"
                    placeholder="أسود"
                    dir="rtl"
                  />
                </div>
                <div className="w-24">
                  <label className="admin-field-label">Teinte</label>
                  <input
                    type="color"
                    value={normalizeHex(color.hex ?? "#888888")}
                    onChange={(e) => updateColor(color.id, { hex: e.target.value })}
                    className="h-10 w-full cursor-pointer rounded-lg border border-slate-300"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeColor(color.id)}
                  className="mb-0.5 inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
                >
                  <Trash2 size={14} />
                  Supprimer
                </button>
              </div>

              <div className="mb-4">
                <label className="admin-field-label">Photo de la couleur</label>
                <ColorImageUpload
                  image={color.image ?? ""}
                  onChange={(url) => updateColor(color.id, { image: url })}
                />
              </div>

              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Tailles & stock — {color.nameFr || "cette couleur"}
                </p>
              </div>

              <div className="mb-3 flex gap-2">
                <input
                  value={newSizeLabel[color.id] ?? ""}
                  onChange={(e) =>
                    setNewSizeLabel((prev) => ({ ...prev, [color.id]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSizeToColor(color.id);
                    }
                  }}
                  className="admin-field-input"
                  placeholder="Ex. 40 · Petit · Cabine…"
                />
                <button
                  type="button"
                  onClick={() => addSizeToColor(color.id)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  <Plus size={14} />
                  Taille
                </button>
              </div>

              {color.sizes.length === 0 ? (
                <p className="text-xs text-amber-700">
                  Ajoutez au moins une taille pour cette couleur.
                </p>
              ) : (
                <div className="space-y-2">
                  {color.sizes.map((row) => (
                    <div
                      key={row.id}
                      className="grid grid-cols-[1fr_6rem_auto] items-end gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2 sm:grid-cols-[1fr_8rem_auto]"
                    >
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500">Taille</label>
                        <input
                          value={row.size}
                          onChange={(e) => {
                            const prev = row.size;
                            const next = e.target.value;
                            updateSizeStock(color.id, row.id, { size: next });
                            if (prev && next.trim() && prev !== next) {
                              // keep price key in sync when renaming from this row only if unique
                            }
                          }}
                          onBlur={(e) => {
                            const next = e.target.value.trim();
                            if (next && next !== row.size) {
                              renameSizeEverywhere(row.size, next);
                            }
                          }}
                          className="admin-field-input"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500">Stock</label>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={row.stock}
                          onChange={(e) =>
                            updateSizeStock(color.id, row.id, {
                              stock: parseInt(e.target.value, 10) || 0,
                            })
                          }
                          className="admin-field-input"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSizeFromColor(color.id, row.id)}
                        className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                        aria-label="Supprimer taille"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function detectSinglePrice(
  product: Parameters<typeof variantsFromProduct>[0]
): boolean {
  const data = getProductVariants(product);
  if (sizeLabels(data).length === 0) return true;
  return allSizesShareSamePrice(data);
}
