export function formatPrice(price: number, locale: "fr" | "ar" = "fr"): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-DZ" : "fr-DZ", {
    style: "currency",
    currency: "DZD",
    maximumFractionDigits: 0,
  }).format(price);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function generateOrderNumber(): string {
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `ZL-${y}${m}${d}-${rand}`;
}

const LEGACY_CATEGORY_LABELS: Record<string, { fr: string; ar: string }> = {
  TALONS: { fr: "Talons", ar: "كعب عالي" },
  CHAUSSURES: { fr: "Chaussures", ar: "أحذية" },
  SACS: { fr: "Sacs", ar: "حقائب" },
  POCHETTES: { fr: "Pochettes", ar: "محافظ" },
  VALISES: { fr: "Valises", ar: "حقائب سفر" },
  LUNETTES: { fr: "Lunettes", ar: "نظارات" },
};

export function categoryLabel(
  category: string,
  lang: "fr" | "ar",
  catalogs?: { slug: string; nameFr: string; nameAr: string }[]
): string {
  const fromDb = catalogs?.find((c) => c.slug === category);
  if (fromDb) return lang === "fr" ? fromDb.nameFr : fromDb.nameAr;
  return LEGACY_CATEGORY_LABELS[category]?.[lang] ?? category;
}

export function getEffectivePrice(product: {
  price: number;
  onPromo?: boolean;
  promoPrice?: number | null;
}): number {
  if (product.onPromo && product.promoPrice != null && product.promoPrice > 0) {
    return product.promoPrice;
  }
  return product.price;
}

export function getPromoDiscountPercent(price: number, promoPrice: number): number {
  if (price <= 0) return 0;
  return Math.round(((price - promoPrice) / price) * 100);
}

export function normalizeHex(value: string, fallback = "#888888"): string {
  const trimmed = value.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) return trimmed;
  if (/^[0-9A-Fa-f]{6}$/.test(trimmed)) return `#${trimmed}`;
  return fallback;
}

export type ColorEntry = {
  nameFr: string;
  nameAr: string;
  image?: string;
  hex?: string;
};

export type ProductColor = ColorEntry;

export function parseJsonColors(value: string): ColorEntry[] {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      nameFr: String(item?.nameFr ?? ""),
      nameAr: String(item?.nameAr ?? item?.nameFr ?? ""),
      image: item?.image ? String(item.image) : undefined,
      hex: item?.hex ? normalizeHex(String(item.hex)) : undefined,
    }));
  } catch {
    return [];
  }
}

export function getColorLabel(color: ColorEntry, lang: "fr" | "ar"): string {
  return lang === "fr" ? color.nameFr : color.nameAr;
}

export function getProductImages(images: string, colors?: string): string[] {
  const colorList = parseJsonColors(colors ?? "[]");
  const fallbackImages = parseJsonArray(images);
  if (colorList.length > 0) {
    return colorList.map((c) => c.image || fallbackImages[0] || "");
  }
  return fallbackImages;
}

export function getRatingSummary(reviews: { rating: number }[]): { avg: number; count: number } {
  if (reviews.length === 0) return { avg: 0, count: 0 };
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return { avg: sum / reviews.length, count: reviews.length };
}

export function isNewProduct(createdAt?: Date | string, days = 14): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return created >= Date.now() - days * 24 * 60 * 60 * 1000;
}

/** Strip admin-only fields before sending a product to the storefront. */
export function toStorefrontProduct<T extends { reference?: string | null }>(
  product: T
): Omit<T, "reference"> {
  const { reference: _reference, ...rest } = product;
  return rest;
}
