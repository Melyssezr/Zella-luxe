"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";
import { ProductCard } from "@/components/ProductCard";

type Product = {
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
  createdAt: string | Date;
  avgRating: number;
  reviewCount: number;
};

export function PromotionsClient({ products }: { products: Product[] }) {
  const { lang } = useLanguage();
  const tr = t(lang);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      <div className="mb-12 text-center">
        <span className="text-[11px] font-semibold uppercase tracking-[0.45em] text-[#8b6914]">{tr.promotions.badge}</span>
        <h1 className="font-display mt-3 text-4xl font-medium md:text-5xl">
          <span className="italic text-[#8b6914]">{tr.promotions.title}</span>
        </h1>
        <p className="mt-3 font-light tracking-wide text-[#806f60]">{tr.promotions.subtitle}</p>
      </div>

      {products.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-[#806f60]">{tr.promotions.empty}</p>
          <Link href="/catalogue" className="btn-neon mt-6 inline-block rounded-full px-8 py-3 text-sm">
            {tr.catalogue.title}
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
