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

const NAMED_HEX: Record<string, string> = {
  noir: "#1a1a1a",
  noire: "#1a1a1a",
  black: "#1a1a1a",
  blanc: "#f7f4ee",
  blanche: "#f7f4ee",
  white: "#f7f4ee",
  ivoire: "#f4edd8",
  ivory: "#f4edd8",
  champagne: "#ead9b5",
  beige: "#dcc7a6",
  nude: "#e6cbb3",
  or: "#c9a86c",
  gold: "#c9a86c",
  dore: "#c9a86c",
  doree: "#c9a86c",
  argent: "#c5c5c5",
  silver: "#c5c5c5",
  gris: "#8a8a8a",
  gray: "#8a8a8a",
  grey: "#8a8a8a",
  bordeaux: "#65232b",
  burgundy: "#65232b",
  wine: "#65232b",
  rouge: "#9b1c1c",
  red: "#9b1c1c",
  rose: "#e8a0b0",
  pink: "#e8a0b0",
  marron: "#6b4423",
  brown: "#6b4423",
  chocolat: "#4a2c2a",
  chocolate: "#4a2c2a",
  bleu: "#1e3a5f",
  blue: "#1e3a5f",
  marine: "#1e3a5f",
  navy: "#1e3a5f",
  vert: "#3d5c3a",
  green: "#3d5c3a",
  camel: "#c19a6b",
  taupe: "#8b7d6b",
  kaki: "#6b6b3d",
  khaki: "#6b6b3d",
};

export function colorKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function hexFromColorName(name?: string, fallback = "") {
  if (!name?.trim()) return fallback;
  return NAMED_HEX[colorKey(name)] || fallback;
}

export function normalizeHex(value: string, fallback = "#888888"): string {
  const trimmed = value.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) return trimmed;
  if (/^[0-9A-Fa-f]{6}$/.test(trimmed)) return `#${trimmed}`;
  return fallback;
}

export function resolveColorHex(hex?: string, name?: string) {
  if (hex?.trim()) {
    const normalized = normalizeHex(hex, "");
    if (normalized) return normalized;
  }
  return hexFromColorName(name, "") || undefined;
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
      image: item?.image && isStorefrontImageUrl(String(item.image)) ? String(item.image) : undefined,
      hex: resolveColorHex(item?.hex ? String(item.hex) : undefined, String(item?.nameFr ?? "")),
    }));
  } catch {
    return [];
  }
}

export function getColorLabel(color: ColorEntry, lang: "fr" | "ar"): string {
  return lang === "fr" ? color.nameFr : color.nameAr;
}

export function isStorefrontImageUrl(src?: string) {
  const value = src?.trim() ?? "";
  if (!value || value.startsWith("blob:") || value.includes("/src/") || value.includes("/@fs/")) {
    return false;
  }
  if (value.startsWith("data:image/")) return true;
  if (value.startsWith("https://") || value.startsWith("http://")) {
    return !/localhost|127\.0\.0\.1/i.test(value);
  }
  return /^\/(media|uploads|images|products|placeholder)/.test(value);
}

export function getProductImages(images: string, colors?: string): string[] {
  const colorList = parseJsonColors(colors ?? "[]");
  const fallbackImages = parseJsonArray(images).filter(isStorefrontImageUrl);
  if (colorList.length > 0) {
    const fromColors = colorList
      .map((c) => (isStorefrontImageUrl(c.image) ? c.image : "") || fallbackImages[0] || "")
      .filter(Boolean);
    if (fromColors.length > 0) return fromColors;
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
export function toStorefrontProduct<T extends object>(
  product: T
): Omit<T, "reference"> {
  const { reference: _reference, ...rest } = product as T & { reference?: string | null };
  return rest;
}
