/** @deprecated Prefer database catalogs — kept for backward-compatible imports. */
export type ProductCategory = string;

export type CatalogRecord = {
  id: string;
  slug: string;
  nameFr: string;
  nameAr: string;
  coverImage: string;
  accentColor: string;
  sortOrder: number;
  active: boolean;
};

export const ALL_CATEGORIES_IMAGE = "/images/store-brand.jpg";

/** Fallback cover when a catalog has no coverImage set in the DB. */
const LEGACY_CATEGORY_COVERS: Record<string, string> = {
  TALONS: "/images/escarpin-strass-trio.jpg",
  CHAUSSURES: "/images/botte-guêtre-bordeaux.jpg",
  SACS: "/images/set-strass-multicolore.jpg",
  POCHETTES: "/images/pochette-or-strass.jpg",
  VALISES: "/images/valise-lv-monogram-rouge.jpg",
  LUNETTES:
    "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&h=800&fit=crop&q=80",
};

export function catalogCoverImage(catalog: Pick<CatalogRecord, "slug" | "coverImage">): string {
  if (catalog.coverImage?.trim()) return catalog.coverImage.trim();
  const slug = catalog.slug.toUpperCase();
  if (LEGACY_CATEGORY_COVERS[slug]) return LEGACY_CATEGORY_COVERS[slug];
  return `/images/categories/${catalog.slug.toLowerCase()}.svg`;
}

export function isProductCategory(value: string, catalogs?: Pick<CatalogRecord, "slug">[]): boolean {
  if (catalogs?.length) return catalogs.some((c) => c.slug === value);
  return Boolean(value?.trim());
}

export function catalogLabel(catalog: Pick<CatalogRecord, "nameFr" | "nameAr">, lang: "fr" | "ar"): string {
  return lang === "fr" ? catalog.nameFr : catalog.nameAr;
}
