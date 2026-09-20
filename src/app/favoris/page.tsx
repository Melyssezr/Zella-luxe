"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useWishlist } from "@/context/WishlistContext";
import { t } from "@/lib/i18n";
import { ProductCard } from "@/components/ProductCard";

type WishlistProduct = {
  id: string;
  slug: string;
  nameFr: string;
  nameAr: string;
  price: number;
  promoPrice: number | null;
  onPromo: boolean;
  images: string;
  colors: string;
  stock: number;
  sizes: string;
  category: string;
  createdAt: string;
  viewCount?: number;
  avgRating: number;
  reviewCount: number;
};

export default function FavorisPage() {
  const { lang } = useLanguage();
  const { ids, hydrated } = useWishlist();
  const tr = t(lang);
  const [products, setProducts] = useState<WishlistProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;

    async function load() {
      if (ids.length === 0) {
        if (!cancelled) {
          setProducts([]);
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/products/by-ids?ids=${ids.join(",")}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("fetch failed");
        const data: WishlistProduct[] = await res.json();
        if (!cancelled) {
          const order = new Map(ids.map((id, i) => [id, i]));
          data.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
          setProducts(data);
        }
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [ids, hydrated]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      <div className="mb-12 text-center">
        <span className="text-[11px] font-semibold uppercase tracking-[0.45em] text-[#8b6914]">
          Zella Luxe
        </span>
        <h1 className="font-display mt-3 text-4xl font-medium md:text-5xl">
          <span className="italic text-[#8b6914]">{tr.wishlist.title}</span>
        </h1>
        <p className="mt-3 font-light tracking-wide text-[#806f60]">{tr.wishlist.subtitle}</p>
      </div>

      {!hydrated || loading ? (
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: Math.min(Math.max(ids.length, 1), 4) }).map((_, i) => (
            <div
              key={i}
              className="glass-card aspect-[3/4] animate-pulse rounded-2xl"
            />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="py-16 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#c9a86c]/25 text-[#c9a86c]">
            <Heart size={26} />
          </span>
          <p className="mt-6 text-[#806f60]">{tr.wishlist.empty}</p>
          <Link
            href="/catalogue"
            className="btn-neon mt-6 inline-block rounded-full px-8 py-3 text-sm"
          >
            {tr.wishlist.browse}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} {...product} />
          ))}
        </div>
      )}
    </div>
  );
}
