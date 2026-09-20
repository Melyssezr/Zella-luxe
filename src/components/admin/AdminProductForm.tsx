"use client";

import { useEffect, useState } from "react";
import { FileText, Image, Layers, Tag, Eye } from "lucide-react";
import {
  AdminImageFields,
  type ImageFormRow,
} from "@/components/admin/AdminImageFields";
import {
  AdminVariantFields,
  type ColorVariantForm,
} from "@/components/admin/AdminVariantFields";
import { totalVariantStock } from "@/lib/variants";
import type { CatalogRecord } from "@/lib/categories";

export type ProductFormState = {
  nameFr: string;
  nameAr: string;
  descriptionFr: string;
  descriptionAr: string;
  /** Admin-only; optional; shared by all colors of the product. */
  reference: string;
  price: string;
  promoPrice: string;
  onPromo: boolean;
  category: string;
  featured: boolean;
  active: boolean;
};

const TABS = [
  { id: "info", label: "Informations", icon: FileText },
  { id: "media", label: "Médias", icon: Image },
  { id: "variants", label: "Variantes", icon: Layers },
  { id: "pricing", label: "Promo", icon: Tag },
  { id: "visibility", label: "Visibilité", icon: Eye },
] as const;

type TabId = (typeof TABS)[number]["id"];

type AdminProductFormProps = {
  form: ProductFormState;
  onFormChange: (form: ProductFormState) => void;
  imageRows: ImageFormRow[];
  onImageRowsChange: (rows: ImageFormRow[]) => void;
  colorRows: ColorVariantForm[];
  onColorRowsChange: (rows: ColorVariantForm[]) => void;
  sizePrices: Record<string, number>;
  onSizePricesChange: (prices: Record<string, number>) => void;
  useSinglePrice: boolean;
  onUseSinglePriceChange: (value: boolean) => void;
  editing: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
};

export function AdminProductForm({
  form,
  onFormChange,
  imageRows,
  onImageRowsChange,
  colorRows,
  onColorRowsChange,
  sizePrices,
  onSizePricesChange,
  useSinglePrice,
  onUseSinglePriceChange,
  editing,
  onSubmit,
  onCancel,
}: AdminProductFormProps) {
  const [activeTab, setActiveTab] = useState<TabId>("info");
  const [catalogs, setCatalogs] = useState<CatalogRecord[]>([]);

  useEffect(() => {
    fetch("/api/admin/catalogs")
      .then((r) => r.json())
      .then(setCatalogs)
      .catch(() => setCatalogs([]));
  }, []);

  const setField = <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => {
    onFormChange({ ...form, [key]: value });
  };

  const stockTotal = totalVariantStock(colorRows);

  return (
    <form onSubmit={onSubmit} className="admin-card admin-form-card rounded-xl">
      <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
        <h2 className="font-display text-lg font-bold text-slate-900">
          {editing ? "Modifier le produit" : "Nouveau produit"}
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Complétez chaque section avant d&apos;enregistrer.
        </p>
      </div>

      <div className="admin-form-tabs border-b border-slate-200 px-3 sm:px-4">
        <div className="flex gap-1 overflow-x-auto py-2">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`admin-form-tab inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                activeTab === id ? "admin-form-tab-active" : ""
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {activeTab === "info" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="admin-field-label">Nom (FR)</label>
              <input
                value={form.nameFr}
                onChange={(e) => setField("nameFr", e.target.value)}
                className="admin-field-input"
                required
              />
            </div>
            <div>
              <label className="admin-field-label">Nom (AR)</label>
              <input
                value={form.nameAr}
                onChange={(e) => setField("nameAr", e.target.value)}
                className="admin-field-input"
                dir="rtl"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="admin-field-label">Description (FR)</label>
              <textarea
                value={form.descriptionFr}
                onChange={(e) => setField("descriptionFr", e.target.value)}
                className="admin-field-input min-h-[5rem] resize-y"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="admin-field-label">Description (AR)</label>
              <textarea
                value={form.descriptionAr}
                onChange={(e) => setField("descriptionAr", e.target.value)}
                className="admin-field-input min-h-[5rem] resize-y"
                dir="rtl"
                required
              />
            </div>
            <div>
              <label className="admin-field-label">Catégorie</label>
              <select
                value={form.category}
                onChange={(e) => setField("category", e.target.value)}
                className="admin-field-input"
              >
                {catalogs.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.nameFr}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="admin-field-label">
                Référence produit{" "}
                <span className="font-normal normal-case tracking-normal text-slate-400">
                  (facultatif)
                </span>
              </label>
              <input
                value={form.reference}
                onChange={(e) => setField("reference", e.target.value)}
                className="admin-field-input"
                placeholder="Ex. ZL-TAL-001"
                maxLength={120}
              />
              <p className="mt-1.5 text-xs text-slate-500">
                Visible uniquement en administration — jamais affichée sur le site client.
              </p>
            </div>
          </div>
        )}

        {activeTab === "media" && (
          <AdminImageFields images={imageRows} onChange={onImageRowsChange} />
        )}

        {activeTab === "variants" && (
          <AdminVariantFields
            colors={colorRows}
            onColorsChange={onColorRowsChange}
            sizePrices={sizePrices}
            onSizePricesChange={onSizePricesChange}
            useSinglePrice={useSinglePrice}
            onUseSinglePriceChange={onUseSinglePriceChange}
            singlePrice={form.price}
            onSinglePriceChange={(value) => setField("price", value)}
          />
        )}

        {activeTab === "pricing" && (
          <div className="grid max-w-lg gap-4">
            <p className="text-sm text-slate-600">
              Les prix se gèrent dans l&apos;onglet <strong>Variantes</strong>
              {useSinglePrice
                ? " (prix unique pour toutes les tailles)."
                : " (un prix par taille)."}
            </p>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.onPromo}
                onChange={(e) => setField("onPromo", e.target.checked)}
                className="rounded border-slate-300"
              />
              En promotion
            </label>
            {form.onPromo && (
              <div>
                <label className="admin-field-label">Prix promo de référence (DA)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.promoPrice}
                  onChange={(e) => setField("promoPrice", e.target.value)}
                  className="admin-field-input"
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  Appliqué proportionnellement à chaque taille (rapport promo / prix de référence).
                </p>
              </div>
            )}
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => setField("featured", e.target.checked)}
                className="rounded border-slate-300"
              />
              Coup de cœur (mis en avant)
            </label>
          </div>
        )}

        {activeTab === "visibility" && (
          <div className="grid max-w-lg gap-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Stock total (toutes variantes)
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{stockTotal}</p>
              <p className="mt-1 text-xs text-slate-500">
                Calculé automatiquement depuis les stocks Taille + Couleur.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setField("active", e.target.checked)}
                className="rounded border-slate-300"
              />
              Produit actif (visible sur le site)
            </label>
            <p className="text-xs text-slate-500">
              Désactivez pour masquer le produit sans le supprimer.
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-slate-200 px-5 py-4 sm:px-6">
        <button type="submit" className="admin-btn-primary px-6 py-2.5">
          {editing ? "Mettre à jour" : "Créer le produit"}
        </button>
        <button type="button" onClick={onCancel} className="admin-btn-secondary px-6 py-2.5">
          Annuler
        </button>
      </div>
    </form>
  );
}
