"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Tag, Pencil, Percent, PackagePlus } from "lucide-react";
import type { CatalogRecord } from "@/lib/categories";
import { parseJsonArray } from "@/lib/utils";

type Product = {
  id: string;
  nameFr: string;
  price: number;
  promoPrice: number | null;
  onPromo: boolean;
  category: string;
  images: string;
  stock: number;
  active: boolean;
};

export default function AdminPromotionsClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [catalogs, setCatalogs] = useState<CatalogRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/admin/catalogs").then((r) => r.json()),
    ])
      .then(([all, cats]: [Product[], CatalogRecord[]]) => {
        setProducts(all.filter((p) => p.onPromo));
        setCatalogs(cats);
      })
      .finally(() => setLoading(false));
  }, []);

  const promoCount = products.length;
  const activePromo = products.filter((p) => p.active).length;

  return (
    <div>
      <div className="admin-page-header mb-8">
        <span className="admin-page-badge admin-page-badge-promo">Promotions</span>
        <h1 className="font-display mt-2 text-2xl font-bold admin-page-title md:text-3xl">
          Produits en promotion
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {promoCount} produit{promoCount !== 1 ? "s" : ""} en promo
          {activePromo !== promoCount ? ` · ${activePromo} actif${activePromo !== 1 ? "s" : ""}` : ""}
        </p>
      </div>

      <div className="admin-card mb-6 rounded-xl border-l-4 border-l-[#c9a86c] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Percent className="mt-0.5 shrink-0 text-[#c9a86c]" size={20} />
          <div>
            <p className="text-sm font-medium text-slate-800">
              Les promotions apparaissent sur la page{" "}
              <Link href="/promotions" className="text-[#c9a86c] underline-offset-2 hover:underline">
                /promotions
              </Link>{" "}
              du site client.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Activez « En promotion » et définissez un prix promo dans l&apos;édition produit (onglet Prix & promo).
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Chargement…</p>
      ) : products.length === 0 ? (
        <div className="admin-card rounded-xl px-6 py-14 text-center">
          <Tag size={40} className="mx-auto text-[#c9a86c]" />
          <h2 className="font-display mt-4 text-lg font-semibold text-slate-900">Aucune promotion active</h2>
          <p className="mt-2 text-sm text-slate-500">
            Modifiez un produit et activez l&apos;option promotion dans l&apos;onglet Prix & promo.
          </p>
          <Link href="/admin/produits" className="admin-btn-accent mt-6 inline-flex items-center gap-2 px-6 py-3">
            <PackagePlus size={18} />
            Voir le catalogue
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const thumb = parseJsonArray(p.images)[0];
            const discount =
              p.promoPrice && p.price > 0
                ? Math.round(((p.price - p.promoPrice) / p.price) * 100)
                : null;
            return (
              <div key={p.id} className="admin-card admin-promo-card overflow-hidden rounded-xl">
                <div className="relative aspect-[4/3] bg-slate-100">
                  {thumb ? (
                    <Image src={thumb} alt={p.nameFr} fill className="object-cover" sizes="(max-width:768px) 100vw, 33vw" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-400">
                      <Tag size={32} />
                    </div>
                  )}
                  {discount !== null && discount > 0 && (
                    <span className="absolute right-2 top-2 rounded-full bg-[#c9a86c] px-2.5 py-1 text-xs font-bold text-[#1a130a] shadow-lg">
                      -{discount}%
                    </span>
                  )}
                  {!p.active && (
                    <span className="absolute left-2 top-2 rounded-full bg-slate-800/80 px-2 py-0.5 text-xs font-medium text-white">
                      Inactif
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {catalogs.find((c) => c.slug === p.category)?.nameFr ?? p.category}
                  </p>
                  <h3 className="mt-0.5 font-semibold text-slate-900">{p.nameFr}</h3>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-lg font-bold text-[#c9a86c]">
                      {p.promoPrice ?? p.price} DA
                    </span>
                    {p.promoPrice && (
                      <span className="text-sm text-slate-400 line-through">{p.price} DA</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Stock : {p.stock}</p>
                  <Link
                    href={`/admin/produits?edit=${p.id}`}
                    className="admin-btn-secondary mt-4 inline-flex w-full items-center justify-center gap-1.5 py-2 text-xs"
                  >
                    <Pencil size={14} />
                    Modifier la promo
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
