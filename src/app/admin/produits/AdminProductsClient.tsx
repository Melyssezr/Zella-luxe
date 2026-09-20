"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { PackagePlus, Plus, Trash2, Pencil, Tag, Star, EyeOff } from "lucide-react";
import {
  imagesFromJson,
  imagesToPayload,
  type ImageFormRow,
} from "@/components/admin/AdminImageFields";
import {
  AdminProductForm,
  type ProductFormState,
} from "@/components/admin/AdminProductForm";
import {
  detectSinglePrice,
  variantsFromProduct,
  variantsToPayload,
  type ColorVariantForm,
} from "@/components/admin/AdminVariantFields";
import { minVariantPrice, totalVariantStock } from "@/lib/variants";
import type { CatalogRecord } from "@/lib/categories";
import { parseJsonArray } from "@/lib/utils";

function catalogBySlug(catalogs: CatalogRecord[], slug: string) {
  return catalogs.find((c) => c.slug === slug);
}

type Product = {
  id: string;
  slug: string;
  nameFr: string;
  nameAr: string;
  descriptionFr: string;
  descriptionAr: string;
  reference: string | null;
  price: number;
  promoPrice: number | null;
  onPromo: boolean;
  category: string;
  images: string;
  colors: string;
  sizes: string;
  variants?: string | null;
  stock: number;
  featured: boolean;
  active: boolean;
};

const emptyProduct: ProductFormState = {
  nameFr: "",
  nameAr: "",
  descriptionFr: "",
  descriptionAr: "",
  reference: "",
  price: "",
  promoPrice: "",
  onPromo: false,
  category: "TALONS",
  featured: false,
  active: true,
};

function emptyVariants() {
  return variantsFromProduct({
    price: 0,
    stock: 0,
    sizes: "[]",
    colors: "[]",
    variants: "[]",
  });
}

function productThumb(images: string): string | null {
  const urls = parseJsonArray(images);
  return urls[0] ?? null;
}

export default function AdminProductsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryFilter = searchParams.get("category");
  const [catalogs, setCatalogs] = useState<CatalogRecord[]>([]);
  const validCategory =
    categoryFilter && catalogs.some((c) => c.slug === categoryFilter) ? categoryFilter : null;

  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState(emptyProduct);
  const [imageRows, setImageRows] = useState<ImageFormRow[]>([]);
  const initial = emptyVariants();
  const [colorRows, setColorRows] = useState<ColorVariantForm[]>(initial.colors);
  const [sizePrices, setSizePrices] = useState<Record<string, number>>(initial.sizePrices);
  const [useSinglePrice, setUseSinglePrice] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const load = async () => {
    try {
      const res = await fetch("/api/products", { cache: "no-store" });
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      setProducts([]);
    }
  };
  useEffect(() => {
    load();
    fetch("/api/admin/catalogs")
      .then((r) => r.json())
      .then((data) => setCatalogs(Array.isArray(data) ? data : []))
      .catch(() => setCatalogs([]));
  }, []);

  const editId = searchParams.get("edit");

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (validCategory && p.category !== validCategory) return false;
      if (!q) return true;
      return (
        p.nameFr.toLowerCase().includes(q) ||
        p.nameAr.toLowerCase().includes(q) ||
        (p.reference?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [products, validCategory, searchQuery]);

  const resetFormState = () => {
    setForm(emptyProduct);
    setImageRows([]);
    const v = emptyVariants();
    setColorRows(v.colors);
    setSizePrices(v.sizePrices);
    setUseSinglePrice(true);
    setEditing(null);
    setShowForm(false);
  };

  const openCreateForm = () => {
    setEditing(null);
    setForm({
      ...emptyProduct,
      category: validCategory ?? catalogs[0]?.slug ?? "TALONS",
    });
    setImageRows([]);
    const v = emptyVariants();
    setColorRows(v.colors);
    setSizePrices(v.sizePrices);
    setUseSinglePrice(true);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const variants = variantsToPayload(colorRows, sizePrices);
    if (variants.colors.length === 0) {
      alert("Ajoutez au moins une couleur avec une taille (onglet Variantes).");
      return;
    }

    const singlePrice = parseFloat(form.price) || minVariantPrice(variants, 0);
    if (useSinglePrice && (!Number.isFinite(singlePrice) || singlePrice < 0)) {
      alert("Indiquez un prix unique valide (onglet Variantes).");
      return;
    }
    if (
      !useSinglePrice &&
      Object.values(variants.sizePrices).some((p) => !Number.isFinite(p) || p < 0)
    ) {
      alert("Chaque taille doit avoir un prix valide.");
      return;
    }

    const payload = {
      ...form,
      price: useSinglePrice ? singlePrice : minVariantPrice(variants, singlePrice),
      promoPrice: form.onPromo && form.promoPrice ? parseFloat(form.promoPrice) : null,
      images: imagesToPayload(imageRows),
      variants,
      useSinglePrice,
    };

    try {
      const res = editing
        ? await fetch(`/api/products/${editing}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Enregistrement impossible. Vérifiez la catégorie et les champs.");
        return;
      }

      const savedCategory = typeof payload.category === "string" ? payload.category : "";
      const catLabel = catalogBySlug(catalogs, savedCategory)?.nameFr ?? savedCategory;
      resetFormState();
      router.replace("/admin/produits");
      await load();
      alert(
        editing
          ? "Produit mis à jour."
          : `Produit enregistré.\n• Admin : liste « Tous les produits »\n• Site : Catalogue → ${catLabel || "sa catégorie"}`
      );
    } catch {
      alert("Erreur réseau. Réessayez.");
    }
  };

  const startEdit = (p: Product) => {
    setEditing(p.id);
    const v = variantsFromProduct(p);
    const sharePrice = detectSinglePrice(p);
    setForm({
      nameFr: p.nameFr,
      nameAr: p.nameAr,
      descriptionFr: p.descriptionFr,
      descriptionAr: p.descriptionAr,
      reference: p.reference ?? "",
      price: String(
        sharePrice
          ? Object.values(v.sizePrices)[0] ?? p.price
          : p.price
      ),
      promoPrice: p.promoPrice ? String(p.promoPrice) : "",
      onPromo: p.onPromo,
      category: p.category,
      featured: p.featured,
      active: p.active,
    });
    setImageRows(imagesFromJson(p.images ?? "[]"));
    setColorRows(v.colors);
    setSizePrices(v.sizePrices);
    setUseSinglePrice(sharePrice);
    setShowForm(true);
  };

  useEffect(() => {
    if (!editId || products.length === 0 || showForm) return;
    const product = products.find((p) => p.id === editId);
    if (product) startEdit(product);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open once when edit param + products load
  }, [editId, products]);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce produit ?")) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    load();
  };

  const pageTitle = validCategory
    ? catalogBySlug(catalogs, validCategory)?.nameFr ?? validCategory
    : "Tous les produits";

  const accent = validCategory
    ? catalogBySlug(catalogs, validCategory)?.accentColor ?? "#b8956a"
    : "#b8956a";

  return (
    <div>
      <div className="admin-page-header mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="admin-page-badge">Catalogue</span>
          <h1 className="font-display mt-2 text-2xl font-bold admin-page-title md:text-3xl">
            {pageTitle}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {filteredProducts.length} produit{filteredProducts.length !== 1 ? "s" : ""}
            {validCategory ? ` · ${catalogBySlug(catalogs, validCategory)?.nameFr ?? validCategory}` : ""}
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={openCreateForm}
            className="admin-btn-accent inline-flex items-center gap-2 px-6 py-3"
            style={{ boxShadow: `0 4px 20px ${accent}44` }}
          >
            <PackagePlus size={20} />
            Ajouter un produit
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-8">
          <AdminProductForm
            form={form}
            onFormChange={setForm}
            imageRows={imageRows}
            onImageRowsChange={setImageRows}
            colorRows={colorRows}
            onColorRowsChange={setColorRows}
            sizePrices={sizePrices}
            onSizePricesChange={setSizePrices}
            useSinglePrice={useSinglePrice}
            onUseSinglePriceChange={setUseSinglePrice}
            editing={!!editing}
            onSubmit={handleSubmit}
            onCancel={resetFormState}
          />
        </div>
      )}

      {!showForm && (
        <div className="mb-4">
          <label className="sr-only" htmlFor="admin-product-search">
            Rechercher un produit
          </label>
          <input
            id="admin-product-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom ou référence…"
            className="admin-field-input max-w-md"
          />
        </div>
      )}

      {!showForm && filteredProducts.length === 0 && (
        <div className="admin-card mb-8 rounded-xl px-6 py-14 text-center">
          <PackagePlus size={40} className="mx-auto text-[#b8956a]" />
          <h2 className="font-display mt-4 text-lg font-semibold text-slate-900">
            {searchQuery.trim()
              ? "Aucun résultat"
              : `Aucun produit${validCategory ? ` dans ${pageTitle}` : ""}`}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {searchQuery.trim()
              ? "Essayez un autre nom ou une autre référence."
              : "Commencez par ajouter un produit à cette catégorie."}
          </p>
          {!searchQuery.trim() && (
            <button type="button" onClick={openCreateForm} className="admin-btn-accent mt-6 inline-flex items-center gap-2 px-6 py-3">
              <Plus size={18} />
              Ajouter un produit
            </button>
          )}
        </div>
      )}

      {!showForm && filteredProducts.length > 0 && (
        <div className="admin-card overflow-hidden rounded-xl">
          <div className="overflow-x-auto">
            <table className="admin-table w-full text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left">Produit</th>
                  <th className="px-4 py-3 text-left">Référence</th>
                  <th className="px-4 py-3 text-left">Catégorie</th>
                  <th className="px-4 py-3 text-left">Prix</th>
                  <th className="px-4 py-3 text-left">Stock</th>
                  <th className="px-4 py-3 text-left">Statut</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const thumb = productThumb(p.images);
                  const cat = catalogBySlug(catalogs, p.category);
                  const catAccent = cat?.accentColor ?? "#b8956a";
                  const stock = p.stock ?? totalVariantStock(variantsFromProduct(p).colors);
                  return (
                    <tr key={p.id} className="admin-table-row border-t border-slate-100">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-slate-50">
                            {thumb ? (
                              <Image src={thumb} alt="" fill className="object-cover" sizes="44px" />
                            ) : (
                              <div className="flex h-full items-center justify-center text-slate-400">
                                <PackagePlus size={18} />
                              </div>
                            )}
                          </div>
                          <span className="font-medium text-slate-900">{p.nameFr}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {p.reference ? (
                          <span className="font-mono text-xs text-slate-600">{p.reference}</span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase"
                          style={{
                            background: `${catAccent}18`,
                            color: catAccent,
                          }}
                        >
                          {cat?.nameFr ?? p.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {p.onPromo && p.promoPrice ? (
                          <span>
                            <span className="font-semibold text-[#c9a86c]">{p.promoPrice} DA</span>
                            <span className="ml-1.5 text-xs text-slate-400 line-through">{p.price} DA</span>
                          </span>
                        ) : (
                          <span>{p.price} DA</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={stock <= 3 ? "font-semibold text-amber-600" : ""}>
                          {stock}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {!p.active && (
                            <span className="admin-badge admin-badge-muted inline-flex items-center gap-0.5">
                              <EyeOff size={11} /> Inactif
                            </span>
                          )}
                          {p.onPromo && (
                            <span className="admin-badge admin-badge-promo inline-flex items-center gap-0.5">
                              <Tag size={11} /> Promo
                            </span>
                          )}
                          {p.featured && (
                            <span className="admin-badge admin-badge-featured inline-flex items-center gap-0.5">
                              <Star size={11} /> Coup de cœur
                            </span>
                          )}
                          {p.active && !p.onPromo && !p.featured && (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(p)}
                            className="rounded-lg p-1.5 text-[#b8956a] transition hover:bg-[#b8956a]/10"
                            aria-label="Modifier"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(p.id)}
                            className="rounded-lg p-1.5 text-red-500 transition hover:bg-red-50"
                            aria-label="Supprimer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
