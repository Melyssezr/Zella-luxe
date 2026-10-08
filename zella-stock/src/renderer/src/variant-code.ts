import type { CatalogProduct, CatalogVariant } from "./catalog";

/** Prefixe code variante imprime sur etiquette (Code128). */
export const VARIANT_CODE_PREFIX = "ZL";

const SHOE_CATS = [
  "escarpin",
  "escarpins",
  "chaussure",
  "chaussures",
  "sandale",
  "sandales",
  "mule",
  "mules",
  "botte",
  "bottes",
  "boots",
  "basket",
  "baskets",
  "mocassin",
  "mocassins",
  "ballerine",
  "ballerines",
  "derby",
  "derbies",
  "sabot",
  "sabots",
  "talon",
  "talons",
];

const BAG_CATS = ["sac", "sacs", "pochette", "pochettes", "maroquinerie"];
const CASE_CATS = ["valise", "valises", "bagage", "bagages"];

export type VariantKind = "shoe" | "bag" | "case" | "other";

export type ResolvedScan = {
  product: CatalogProduct;
  color: string;
  size: string;
  variant: CatalogVariant;
  code: string;
};

function norm(value: string) {
  return value.trim().toLowerCase();
}

function slugPart(value: string) {
  return value
    .trim()
    .replace(/\s+/g, "_")
    .replace(/\|/g, "/")
    .replace(/:/g, "-");
}

function unslug(value: string) {
  return value.replace(/_/g, " ").trim();
}

export function variantKind(category: string): VariantKind {
  const c = norm(category);
  if (SHOE_CATS.some((item) => c.includes(item))) return "shoe";
  if (BAG_CATS.some((item) => c.includes(item))) return "bag";
  if (CASE_CATS.some((item) => c.includes(item))) return "case";
  return "other";
}

/** Libelles a afficher sur etiquette selon categorie. */
export function labelFields(
  product: CatalogProduct,
  color: string,
  size: string,
): { lines: string[]; showColor: boolean; showSize: boolean; sizeLabel: string } {
  const kind = variantKind(product.category);
  const showColor = Boolean(color && color !== "Unique");
  const sizeIsUnique = !size || norm(size) === "unique";
  const showSize = !sizeIsUnique && (kind === "shoe" || kind === "case" || kind === "other");
  const sizeLabel = kind === "shoe" ? "Pointure" : kind === "case" ? "Taille" : "Taille";
  const lines: string[] = [];
  if (showColor) lines.push(`Couleur: ${color}`);
  if (showSize) lines.push(`${sizeLabel}: ${size}`);
  if (!showColor && !showSize && color) lines.push(color);
  return { lines, showColor, showSize, sizeLabel };
}

/** Code barre variante: ZL/REF/Couleur/Pointure */
export function encodeVariantCode(ref: string, color: string, size: string) {
  return [VARIANT_CODE_PREFIX, slugPart(ref).toUpperCase(), slugPart(color), slugPart(size)].join("/");
}

export function parseVariantCode(raw: string): { ref: string; color: string; size: string } | null {
  const code = raw.trim();
  if (!code) return null;

  // ZL/REF/Color/Size
  const slash = code.split("/").map((part) => part.trim()).filter(Boolean);
  if (slash.length >= 4 && slash[0].toUpperCase() === VARIANT_CODE_PREFIX) {
    return {
      ref: slash[1].toUpperCase(),
      color: unslug(slash[2]),
      size: unslug(slash[3]),
    };
  }

  // ZL|REF|Color|Size  or  ZL:REF:Color:Size
  const sep = code.includes("|") ? "|" : code.includes(":") ? ":" : null;
  if (sep) {
    const parts = code.split(sep).map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 4 && parts[0].toUpperCase() === VARIANT_CODE_PREFIX) {
      return {
        ref: parts[1].toUpperCase(),
        color: unslug(parts[2]),
        size: unslug(parts[3]),
      };
    }
  }

  // REF__Color__Size
  if (code.includes("__")) {
    const parts = code.split("__").map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 3) {
      return { ref: parts[0].toUpperCase(), color: unslug(parts[1]), size: unslug(parts[2]) };
    }
  }

  return null;
}

function matchVariant(product: CatalogProduct, color: string, size: string): CatalogVariant | undefined {
  const c = norm(color);
  const s = norm(size);
  return (
    product.variants.find((item) => norm(item.color) === c && norm(item.size) === s) ||
    product.variants.find((item) => norm(item.color) === c && (!s || norm(item.size) === "unique")) ||
    product.variants.find((item) => norm(item.size) === s && (!c || norm(item.color) === "unique"))
  );
}

/**
 * Resolve un scan pistolet vers la vraie variante.
 * Priorite: code ZL/... puis barcode produit unique, puis ref si 1 seule variante en stock.
 */
export function resolveScanCode(
  raw: string,
  catalog: CatalogProduct[],
  findByRef: (ref: string) => CatalogProduct | undefined,
): ResolvedScan | null {
  const code = raw.trim();
  if (!code) return null;

  const parsed = parseVariantCode(code);
  if (parsed) {
    const product = findByRef(parsed.ref) || catalog.find((item) => item.ref.toUpperCase() === parsed.ref);
    if (!product) return null;
    const variant = matchVariant(product, parsed.color, parsed.size);
    if (!variant) return null;
    return {
      product,
      color: variant.color,
      size: variant.size,
      variant,
      code: encodeVariantCode(product.ref, variant.color, variant.size),
    };
  }

  const upper = code.toUpperCase();
  const byBarcode = catalog.find((item) => item.barcode && item.barcode.trim().toUpperCase() === upper);
  if (byBarcode) {
    const inStock = byBarcode.variants.filter((item) => item.qty > 0);
    const pick = inStock.length === 1 ? inStock[0] : byBarcode.variants.length === 1 ? byBarcode.variants[0] : null;
    if (pick) {
      return {
        product: byBarcode,
        color: pick.color,
        size: pick.size,
        variant: pick,
        code: encodeVariantCode(byBarcode.ref, pick.color, pick.size),
      };
    }
  }

  const byRef = findByRef(code) || catalog.find((item) => item.ref.toUpperCase() === upper);
  if (byRef) {
    const inStock = byRef.variants.filter((item) => item.qty > 0);
    const pick = inStock.length === 1 ? inStock[0] : byRef.variants.length === 1 ? byRef.variants[0] : null;
    if (pick) {
      return {
        product: byRef,
        color: pick.color,
        size: pick.size,
        variant: pick,
        code: encodeVariantCode(byRef.ref, pick.color, pick.size),
      };
    }
  }

  return null;
}
