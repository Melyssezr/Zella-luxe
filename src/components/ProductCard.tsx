"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, Heart } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { t } from "@/lib/i18n";
import { StarRating } from "@/components/StarRating";
import { ProductViewCount } from "@/components/ProductViewCount";
import {
  formatPrice,
  parseJsonColors,
  getColorLabel,
  categoryLabel,
  getPromoDiscountPercent,
  getProductImages,
  isNewProduct,
} from "@/lib/utils";
import {
  allSizesShareSamePrice,
  getEffectiveSizePrice,
  getProductVariants,
  getSizeBasePrice,
  getVariantStock,
  minVariantPrice,
  sizeLabels,
} from "@/lib/variants";
import type { CatalogRecord } from "@/lib/categories";

type ProductCardProps = {
  id: string;
  slug: string;
  nameFr: string;
  nameAr: string;
  price: number;
  promoPrice?: number | null;
  onPromo?: boolean;
  images: string;
  colors?: string;
  variants?: string | null;
  stock: number;
  sizes: string;
  category?: string;
  avgRating?: number;
  reviewCount?: number;
  viewCount?: number;
  createdAt?: Date | string;
  catalogs?: CatalogRecord[];
};

export function ProductCard({
  id,
  slug,
  nameFr,
  nameAr,
  price,
  promoPrice,
  onPromo,
  images,
  colors = "[]",
  variants,
  stock,
  sizes,
  category,
  avgRating = 0,
  reviewCount = 0,
  viewCount = 0,
  createdAt,
  catalogs,
}: ProductCardProps) {
  const { lang } = useLanguage();
  const router = useRouter();
  const { addItem } = useCart();
  const { has, toggle, hydrated } = useWishlist();
  const tr = t(lang);
  const name = lang === "fr" ? nameFr : nameAr;
  const variantList = getProductVariants({ price, stock, sizes, colors, variants });
  const colorList = variantList.colors.length
    ? variantList.colors
    : parseJsonColors(colors);
  const imageList = getProductImages(images, colors);
  const sizeList = sizeLabels(variantList);
  const displayImage = colorList[0]?.image || imageList[0] || "/placeholder.svg";
  const firstColor = variantList.colors[0];
  const firstSize = firstColor?.sizes[0];
  const needsVariantSelection =
    variantList.colors.length > 1 ||
    sizeList.length > 1 ||
    !allSizesShareSamePrice(variantList);
  const listPrice = minVariantPrice(variantList, price);
  const effectivePrice = getEffectiveSizePrice({ price, onPromo, promoPrice }, listPrice);
  const isPromo = onPromo && promoPrice != null && promoPrice > 0;
  const discount = isPromo ? getPromoDiscountPercent(price, promoPrice!) : 0;
  const isNew = isNewProduct(createdAt);
  const saved = hydrated && has(id);
  const firstComboStock =
    firstColor && firstSize
      ? getVariantStock(variantList, firstSize.size, firstColor.nameFr)
      : stock;

  const buildCartItem = () => {
    const colorName = firstColor
      ? getColorLabel(firstColor, lang)
      : colorList[0]
        ? getColorLabel(colorList[0], lang)
        : undefined;
    return {
      productId: id,
      slug,
      nameFr,
      nameAr,
      price: getEffectiveSizePrice(
        { price, onPromo, promoPrice },
        firstSize
          ? getSizeBasePrice(variantList, firstSize.size, price)
          : price
      ),
      image: firstColor?.image || displayImage,
      size: firstSize?.size ?? sizeList[0] ?? "Unique",
      color: colorName,
    };
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    if (stock <= 0) return;
    if (needsVariantSelection) {
      router.push(`/produit/${slug}`);
      return;
    }
    if (firstComboStock <= 0) return;
    addItem(buildCartItem());
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(id);
  };

  return (
    <article className="glass-card group overflow-hidden rounded-2xl">
      <Link href={`/produit/${slug}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden">
          <Image
            src={displayImage}
            alt={name}
            fill
            className="object-cover transition duration-700 group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 100vw, 25vw"
            unoptimized={displayImage.startsWith("data:")}
          />

          <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {isNew && (
              <span className="rounded-full border border-[#c9a86c]/70 bg-[#0a0a0d]/70 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#e4cf9a] backdrop-blur-sm">
                {tr.catalogue.nouveau}
              </span>
            )}
            {category && (
              <span className="rounded-full bg-[#0a0a0d]/70 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#e4cf9a] ring-1 ring-[#c9a86c]/40 backdrop-blur-sm">
                {categoryLabel(category, lang, catalogs)}
              </span>
            )}
          </div>

          <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
            <button
              type="button"
              onClick={handleWishlist}
              aria-label={saved ? tr.wishlist.remove : tr.wishlist.add}
              aria-pressed={saved}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0a0a0d]/70 text-white ring-1 ring-white/15 backdrop-blur-sm transition hover:ring-[#c9a86c]/60"
            >
              <Heart
                size={17}
                className={saved ? "fill-[#c9a86c] text-[#c9a86c]" : "text-white"}
              />
            </button>
            {isPromo && stock > 0 && (
              <span className="rounded-full bg-gradient-to-r from-[#e4cf9a] to-[#c9a86c] px-3 py-1 text-xs font-bold text-[#1a130a] shadow-[0_2px_10px_rgba(201,168,108,0.5)]">
                -{discount}%
              </span>
            )}
            {stock <= 0 && (
              <span className="rounded-full bg-black/80 px-3 py-1 text-xs text-white">
                {tr.catalogue.outOfStock}
              </span>
            )}
          </div>
        </div>
      </Link>

      <div className="space-y-2.5 border-t border-[#a07d3e]/12 p-3 sm:p-3.5">
        <Link href={`/produit/${slug}`} className="block">
          <h3 className="font-display line-clamp-2 text-sm font-medium leading-snug tracking-wide text-[#4d3525] sm:text-base">
            {name}
          </h3>
        </Link>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {reviewCount > 0 && (
            <div className="flex items-center gap-1.5">
              <StarRating rating={Math.round(avgRating)} size={12} />
              <span className="text-[11px] text-[#806f60] sm:text-xs">({reviewCount})</span>
            </div>
          )}
          <ProductViewCount count={viewCount} iconSize={12} className="text-[11px] sm:text-xs" />
        </div>
        <div className="flex flex-wrap items-baseline gap-x-2">
          {!allSizesShareSamePrice(variantList) && (
            <span className="text-[10px] uppercase tracking-wider text-[#806f60]">
              {lang === "ar" ? "ابتداءً من" : "À partir de"}
            </span>
          )}
          <p className="text-base font-bold neon-text-gold sm:text-lg">{formatPrice(effectivePrice, lang)}</p>
          {isPromo && (
            <p className="text-xs text-[#806f60] line-through sm:text-sm">{formatPrice(listPrice, lang)}</p>
          )}
        </div>
        <div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={stock <= 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#e4cf9a] via-[#c9a86c] to-[#a07d3e] px-3 py-3 text-center text-xs font-bold uppercase leading-none tracking-[0.1em] text-[#1a130a] shadow-[0_5px_18px_rgba(201,168,108,0.24)] transition hover:scale-[1.01] hover:shadow-[0_7px_22px_rgba(201,168,108,0.4)] disabled:opacity-40 sm:text-sm"
          >
            <ShoppingBag className="h-5 w-5 shrink-0" />
            <span>{tr.catalogue.addToCart}</span>
          </button>
        </div>
      </div>
    </article>
  );
}

export function CategoryCard({
  href,
  image,
  label,
  accent = "#c9a86c",
}: {
  href: string;
  image: string;
  label: string;
  accent?: string;
}) {
  return (
    <Link
      href={href}
      className="luxe-neon-frame group relative block overflow-hidden rounded-2xl transition duration-500 hover:border-[#c9a84c]"
    >
      <div className="relative aspect-[4/5]">
        <Image src={image} alt={label} fill className="object-cover transition duration-700 group-hover:scale-105" sizes="25vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0d] via-[#0a0a0d]/55 to-[#0a0a0d]/15" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <span
            className="mb-2 block h-0.5 w-8 transition-all duration-500 group-hover:w-14"
            style={{ backgroundColor: accent }}
          />
          <span
            className="font-display text-xl font-medium tracking-wide text-[#f3e6c4]"
            style={{ textShadow: "0 2px 12px rgba(0,0,0,0.85), 0 0 20px rgba(201,168,108,0.35)" }}
          >
            {label}
          </span>
        </div>
      </div>
    </Link>
  );
}
