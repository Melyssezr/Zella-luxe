"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ShoppingBag, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useCart } from "@/context/CartContext";
import { t } from "@/lib/i18n";
import {
  formatPrice,
  getColorLabel,
  categoryLabel,
  getPromoDiscountPercent,
  getProductImages,
} from "@/lib/utils";
import {
  getEffectiveSizePrice,
  getProductVariants,
  getSizeBasePrice,
  getVariantStock,
  sizeLabels,
} from "@/lib/variants";
import { ProductCard } from "@/components/ProductCard";
import { ColorSwatches } from "@/components/ColorSwatches";
import { StarRating } from "@/components/StarRating";
import { ProductViewCount } from "@/components/ProductViewCount";
import { TrackProductView } from "@/components/TrackProductView";

type Product = {
  id: string;
  slug: string;
  nameFr: string;
  nameAr: string;
  descriptionFr: string;
  descriptionAr: string;
  price: number;
  promoPrice?: number | null;
  onPromo?: boolean;
  images: string;
  colors?: string;
  sizes: string;
  variants?: string | null;
  stock: number;
  category: string;
  createdAt?: Date | string;
  viewCount?: number;
  avgRating?: number;
  reviewCount?: number;
};

export function ProductDetailClient({
  product,
  related,
}: {
  product: Product;
  related: Product[];
}) {
  const { lang } = useLanguage();
  const { addItem } = useCart();
  const tr = t(lang);

  const variants = useMemo(() => getProductVariants(product), [product]);
  const colorList = variants.colors;

  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [viewCount, setViewCount] = useState(product.viewCount ?? 0);

  const selectedColorEntry = colorList[selectedColor] ?? colorList[0];
  const sizesForColor = selectedColorEntry?.sizes ?? [];

  useEffect(() => {
    if (colorList.length === 0) return;
    if (selectedColor >= colorList.length) {
      setSelectedColor(0);
      return;
    }
    const firstInStock = sizesForColor.find((s) => s.stock > 0);
    setSelectedSize(firstInStock?.size ?? sizesForColor[0]?.size ?? sizeLabels(variants)[0] ?? "Unique");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync size when color changes
  }, [selectedColor, colorList.length]);

  const name = lang === "fr" ? product.nameFr : product.nameAr;
  const description = lang === "fr" ? product.descriptionFr : product.descriptionAr;

  const sizeBasePrice = getSizeBasePrice(variants, selectedSize, product.price);
  const effectivePrice = getEffectiveSizePrice(product, sizeBasePrice);
  const isPromo = product.onPromo && product.promoPrice != null && product.promoPrice > 0;
  const discount = isPromo ? getPromoDiscountPercent(product.price, product.promoPrice!) : 0;

  const galleryImages = getProductImages(product.images, product.colors ?? "[]");
  const displayImage =
    selectedColorEntry?.image ||
    galleryImages[selectedColor] ||
    galleryImages[0] ||
    "/placeholder.svg";

  const colorLabel = selectedColorEntry
    ? getColorLabel(selectedColorEntry, lang)
    : undefined;
  const variantStock = getVariantStock(variants, selectedSize, colorLabel);
  const inStock = variantStock > 0;

  const handleViewCounted = useCallback((count: number) => {
    setViewCount((prev) => (count < 0 ? prev + 1 : count));
  }, []);

  const buildCartItem = () => ({
    productId: product.id,
    slug: product.slug,
    nameFr: product.nameFr,
    nameAr: product.nameAr,
    price: effectivePrice,
    image: displayImage,
    size: selectedSize,
    color: colorLabel,
  });

  const handleAdd = () => {
    if (!inStock) return;
    addItem(buildCartItem());
  };

  const swatchColors = colorList.map((c) => ({
    nameFr: c.nameFr,
    nameAr: c.nameAr,
    hex: c.hex,
    image: c.image,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
      <TrackProductView productId={product.id} onCounted={handleViewCounted} />
      <Link href="/catalogue" className="mb-6 inline-flex items-center gap-2 text-sm text-[#806f60] transition hover:text-[#a07d3e]">
        <ArrowLeft size={16} />
        {tr.nav.catalogue}
      </Link>
      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <div className="relative aspect-[3/4] overflow-hidden rounded-3xl border border-[#a07d3e]/20 shadow-[0_15px_45px_rgba(89,58,30,0.15)]">
            <Image src={displayImage} alt={name} fill className="object-cover" priority sizes="50vw" />
          </div>
          {galleryImages.length > 1 && colorList.length === 0 && (
            <div className="mt-4 flex gap-2">
              {galleryImages.map((img, i) => (
                <button key={img} type="button" onClick={() => setSelectedColor(i)}
                  className={`relative h-20 w-16 overflow-hidden rounded-xl border-2 transition ${selectedColor === i ? "border-[#c9a86c] shadow-[0_0_15px_rgba(201,168,108,0.4)]" : "border-[#a07d3e]/15"}`}>
                  <Image src={img} alt="" fill className="object-cover" sizes="64px" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.45em] text-[#8b6914]">
            {categoryLabel(product.category, lang)}
          </span>
          <h1 className="font-display mt-3 text-3xl font-medium text-[#4d3525] md:text-5xl">{name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            {(product.reviewCount ?? 0) > 0 && (
              <div className="flex items-center gap-2">
                <StarRating rating={Math.round(product.avgRating ?? 0)} size={16} />
                <span className="text-sm text-[#806f60]">
                  ({product.reviewCount} {tr.catalogue.reviews})
                </span>
              </div>
            )}
            <ProductViewCount count={viewCount} iconSize={15} className="text-sm" />
          </div>
          <div className="mt-4 flex flex-wrap items-baseline gap-3">
            <p className="font-display text-3xl font-bold neon-text-gold">{formatPrice(effectivePrice, lang)}</p>
            {isPromo && (
              <>
                <p className="text-lg text-[#806f60] line-through">{formatPrice(sizeBasePrice, lang)}</p>
                <span className="rounded-full bg-[#c9a86c] px-3 py-1 text-xs font-bold text-[#1a130a]">-{discount}%</span>
              </>
            )}
          </div>
          <p className="mt-2 text-sm text-[#806f60]">
            {inStock
              ? `${tr.catalogue.inStock}${variantStock <= 5 ? ` (${variantStock})` : ""}`
              : tr.catalogue.outOfStock}
          </p>

          <div className="mt-8 space-y-6">
            {swatchColors.length > 0 && (
              <ColorSwatches
                colors={swatchColors}
                selected={Math.min(selectedColor, swatchColors.length - 1)}
                onSelect={setSelectedColor}
              />
            )}

            {sizesForColor.length > 0 && (
              <div>
                <p className="mb-3 text-sm font-semibold text-[#4d3525]">{tr.catalogue.size}</p>
                <div className="flex flex-wrap gap-2">
                  {sizesForColor.map((row) => {
                    const available = row.stock > 0;
                    return (
                      <button
                        key={row.size}
                        type="button"
                        disabled={!available}
                        onClick={() => setSelectedSize(row.size)}
                        className={`min-w-[48px] rounded-full border px-4 py-2 text-sm font-semibold transition ${
                          selectedSize === row.size
                            ? "border-[#c9a86c] bg-gradient-to-r from-[#e4cf9a] to-[#c9a86c] text-[#1a130a] shadow-[0_0_15px_rgba(201,168,108,0.4)]"
                            : available
                              ? "border-[#a07d3e]/20 bg-white/35 text-[#6f5a49] hover:border-[#c9a86c]/60 hover:text-[#4d3525]"
                              : "cursor-not-allowed border-[#a07d3e]/10 text-[#a99b8e] line-through opacity-50"
                        }`}
                      >
                        {row.size}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="mt-8">
            <button
              type="button"
              disabled={!inStock}
              onClick={handleAdd}
              className="btn-neon flex w-full items-center justify-center gap-3 rounded-2xl px-6 py-4 text-sm font-bold uppercase tracking-[0.12em] shadow-[0_8px_28px_rgba(201,168,108,0.3)] transition hover:scale-[1.01] disabled:opacity-40 sm:py-5 sm:text-base"
            >
              <ShoppingBag size={23} className="shrink-0" />
              {tr.catalogue.addToCart}
            </button>
          </div>
          <div className="glass-card mt-10 rounded-2xl p-6">
            <h2 className="font-display text-lg font-medium text-[#8b6914]">{tr.product.description}</h2>
            <p className="mt-3 font-light leading-relaxed tracking-wide text-[#6f5a49]">{description}</p>
          </div>
        </div>
      </div>
      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="font-display mb-8 text-2xl font-medium text-[#4d3525]">{tr.product.related}</h2>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} {...p} colors={p.colors} variants={p.variants} viewCount={p.viewCount} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
