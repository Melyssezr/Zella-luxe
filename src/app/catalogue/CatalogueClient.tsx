"use client";

import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LayoutGrid, Search } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";
import { getEffectivePrice } from "@/lib/utils";
import {
  ALL_CATEGORIES_IMAGE,
  catalogCoverImage,
  catalogLabel,
  type CatalogRecord,
} from "@/lib/categories";
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
  viewCount?: number;
  avgRating: number;
  reviewCount: number;
};

type SortKey = "new" | "priceAsc" | "priceDesc" | "promo";

const PAGE_SIZE = 12;

function CategoryFilterItem({
  href,
  label,
  image,
  active,
  rtl,
}: {
  href: string;
  label: string;
  image?: string;
  active: boolean;
  rtl?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group flex w-[4.5rem] shrink-0 snap-center flex-col items-center gap-2 sm:w-[5.5rem] md:w-24"
    >
      <div
        className={`relative h-16 w-16 overflow-hidden rounded-full border-2 transition duration-300 sm:h-20 sm:w-20 ${
          active
            ? "border-[#8b6914] shadow-[0_0_16px_rgba(139,105,20,0.24)]"
            : "border-[#8b6914]/35 group-hover:border-[#8b6914]/70"
        }`}
      >
        {image ? (
          <Image
            src={image}
            alt={label}
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
            sizes="80px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#c9a86c]/25 to-[#a07d3e]/15">
            <LayoutGrid
              size={28}
              className={active ? "text-[#c9a86c]" : "text-[#c9a86c]/70"}
              strokeWidth={1.5}
            />
          </div>
        )}
      </div>
      <span
        dir={rtl ? "rtl" : undefined}
        className={`line-clamp-2 text-center text-[11px] font-medium leading-tight transition sm:text-xs ${
          active ? "font-semibold text-[#8b6914]" : "text-[#6f5a49] group-hover:text-[#4d3525]"
        }`}
      >
        {label}
      </span>
    </Link>
  );
}

export function CatalogueClient({
  products,
  catalogs,
}: {
  products: Product[];
  catalogs: CatalogRecord[];
}) {
  const { lang } = useLanguage();
  const tr = t(lang);
  const searchParams = useSearchParams();
  const requestedCategory = searchParams.get("category") ?? undefined;
  const activeCategory =
    requestedCategory && catalogs.some((catalog) => catalog.slug === requestedCategory)
      ? requestedCategory
      : undefined;

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("new");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = activeCategory
      ? products.filter((product) => product.category === activeCategory)
      : products;
    if (q) {
      list = list.filter(
        (p) =>
          p.nameFr.toLowerCase().includes(q) || p.nameAr.toLowerCase().includes(q)
      );
    }

    const sorted = [...list];
    const createdTime = (v: string | Date) => new Date(v).getTime();
    switch (sortKey) {
      case "priceAsc":
        sorted.sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
        break;
      case "priceDesc":
        sorted.sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a));
        break;
      case "promo":
        sorted.sort((a, b) => {
          const ap = a.onPromo && a.promoPrice != null ? 1 : 0;
          const bp = b.onPromo && b.promoPrice != null ? 1 : 0;
          if (ap !== bp) return bp - ap;
          return createdTime(b.createdAt) - createdTime(a.createdAt);
        });
        break;
      default:
        sorted.sort((a, b) => createdTime(b.createdAt) - createdTime(a.createdAt));
    }
    return sorted;
  }, [products, search, sortKey, activeCategory]);

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [search, sortKey, activeCategory]);

  const shown = filtered.slice(0, visible);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      <div className="mb-12 text-center">
        <span className="text-[11px] font-semibold uppercase tracking-[0.45em] text-[#8b6914]">Zella Luxe</span>
        <h1 className="font-display mt-3 text-4xl font-medium md:text-5xl">
          <span className="italic text-[#8b6914]">{tr.catalogue.title}</span>
        </h1>
        <p className="mt-3 font-light tracking-wide text-[#806f60]">{tr.catalogue.subtitle}</p>
      </div>

      <div className="luxe-neon-frame relative mb-8 rounded-3xl bg-[#fffaf2]/28 px-3 py-5 backdrop-blur-sm sm:px-5">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 rounded-l-3xl bg-gradient-to-r from-[#fffaf2]/90 to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 rounded-r-3xl bg-gradient-to-l from-[#fffaf2]/90 to-transparent"
        />
        <div
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label={tr.catalogue.filter}
        >
          <CategoryFilterItem
            href="/catalogue"
            label={tr.catalogue.all}
            image={ALL_CATEGORIES_IMAGE}
            active={!activeCategory}
          />
          {catalogs.map((cat) => (
            <CategoryFilterItem
              key={cat.id}
              href={`/catalogue?category=${cat.slug}`}
              label={catalogLabel(cat, lang)}
              image={catalogCoverImage(cat)}
              active={activeCategory === cat.slug}
              rtl={lang === "ar"}
            />
          ))}
        </div>
      </div>

      <div className="mb-10 flex flex-row items-center gap-2 sm:justify-between sm:gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#806f60] sm:left-4"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tr.catalogue.searchPlaceholder}
            className="w-full rounded-full border border-[#a07d3e]/20 bg-[#fffaf2]/70 py-2 pl-9 pr-3 text-xs text-[#3d2b1f] placeholder:text-[#988778] shadow-sm backdrop-blur-md transition focus:border-[#c9a86c] focus:outline-none sm:py-2.5 sm:pl-11 sm:pr-4 sm:text-sm"
          />
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <label
            htmlFor="sort"
            className="hidden text-xs uppercase tracking-wider text-[#806f60] sm:inline"
          >
            {tr.catalogue.sortBy}
          </label>
          <select
            id="sort"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="max-w-[9.5rem] rounded-full border border-[#a07d3e]/20 bg-[#fffaf2]/85 px-2 py-2 text-xs text-[#3d2b1f] shadow-sm transition focus:border-[#c9a86c] focus:outline-none sm:max-w-none sm:px-4 sm:py-2.5 sm:text-sm"
          >
            <option value="new">{tr.catalogue.sortNew}</option>
            <option value="priceAsc">{tr.catalogue.sortPriceAsc}</option>
            <option value="priceDesc">{tr.catalogue.sortPriceDesc}</option>
            <option value="promo">{tr.catalogue.sortPromo}</option>
          </select>
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="py-20 text-center text-[#806f60]">{tr.catalogue.noProducts}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
            {shown.map((product) => (
              <ProductCard key={product.id} {...product} catalogs={catalogs} />
            ))}
          </div>
          {visible < filtered.length && (
            <div className="mt-12 text-center">
              <button
                type="button"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="btn-neon-outline rounded-full px-10 py-3 text-sm font-semibold uppercase"
              >
                {tr.catalogue.loadMore}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
