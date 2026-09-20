import { normalizeHex, parseJsonArray, parseJsonColors, type ColorEntry } from "@/lib/utils";

/** Stock d’une taille sous une couleur. */
export type ColorSizeStock = {
  size: string;
  stock: number;
};

/** Variante couleur : tailles + stock par taille. */
export type ColorVariant = {
  nameFr: string;
  nameAr: string;
  hex?: string;
  image?: string;
  sizes: ColorSizeStock[];
};

/** Structure canonique (v2) : Couleur → Tailles(+stock), prix par taille. */
export type ProductVariantsData = {
  v: 2;
  sizePrices: Record<string, number>;
  colors: ColorVariant[];
};

/** @deprecated Ancienne structure Taille → Couleurs (v1). */
export type SizeVariantV1 = {
  size: string;
  price: number;
  colors: Array<{
    nameFr: string;
    nameAr: string;
    hex?: string;
    image?: string;
    stock: number;
  }>;
};

function emptyVariants(): ProductVariantsData {
  return { v: 2, sizePrices: {}, colors: [] };
}

function migrateV1ToV2(rows: SizeVariantV1[]): ProductVariantsData {
  const sizePrices: Record<string, number> = {};
  const colorMap = new Map<string, ColorVariant>();

  for (const row of rows) {
    const size = row.size.trim();
    if (!size) continue;
    sizePrices[size] = Number.isFinite(row.price) && row.price >= 0 ? row.price : 0;

    for (const c of row.colors) {
      const nameFr = c.nameFr.trim();
      if (!nameFr) continue;
      const key = nameFr.toLowerCase();
      let color = colorMap.get(key);
      if (!color) {
        color = {
          nameFr,
          nameAr: (c.nameAr || nameFr).trim() || nameFr,
          hex: c.hex,
          image: c.image,
          sizes: [],
        };
        colorMap.set(key, color);
      }
      if (!color.hex && c.hex) color.hex = c.hex;
      if (!color.image && c.image) color.image = c.image;
      const existing = color.sizes.find((s) => s.size.toLowerCase() === size.toLowerCase());
      if (existing) {
        existing.stock += Math.max(0, c.stock);
      } else {
        color.sizes.push({ size, stock: Math.max(0, c.stock) });
      }
    }
  }

  return { v: 2, sizePrices, colors: [...colorMap.values()] };
}

function parseV1Array(parsed: unknown[]): SizeVariantV1[] {
  return parsed
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      const size = String(r.size ?? "").trim();
      if (!size) return null;
      const price = Number(r.price);
      const colorsRaw = Array.isArray(r.colors) ? r.colors : [];
      const colors = colorsRaw
        .map((c) => {
          if (!c || typeof c !== "object") return null;
          const col = c as Record<string, unknown>;
          const nameFr = String(col.nameFr ?? "").trim();
          if (!nameFr) return null;
          return {
            nameFr,
            nameAr: String(col.nameAr ?? nameFr).trim() || nameFr,
            hex: col.hex ? normalizeHex(String(col.hex)) : undefined,
            image: col.image ? String(col.image) : undefined,
            stock: Math.max(0, Math.floor(Number(col.stock) || 0)),
          };
        })
        .filter(Boolean) as SizeVariantV1["colors"];
      return {
        size,
        price: Number.isFinite(price) && price >= 0 ? price : 0,
        colors,
      };
    })
    .filter(Boolean) as SizeVariantV1[];
}

function parseColorFirstArray(parsed: unknown[], fallbackPrice: number): ProductVariantsData {
  const sizePrices: Record<string, number> = {};
  const colors: ColorVariant[] = [];

  for (const row of parsed) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const nameFr = String(r.nameFr ?? "").trim();
    if (!nameFr) continue;
    const sizesRaw = Array.isArray(r.sizes) ? r.sizes : [];
    const sizes: ColorSizeStock[] = [];
    for (const s of sizesRaw) {
      if (!s || typeof s !== "object") continue;
      const sz = s as Record<string, unknown>;
      const size = String(sz.size ?? "").trim().slice(0, 40);
      if (!size) continue;
      sizes.push({
        size,
        stock: Math.max(0, Math.floor(Number(sz.stock) || 0)),
      });
      if (!(size in sizePrices)) {
        const p = Number(sz.price);
        sizePrices[size] = Number.isFinite(p) && p >= 0 ? p : fallbackPrice;
      }
    }
    colors.push({
      nameFr,
      nameAr: String(r.nameAr ?? nameFr).trim() || nameFr,
      hex: r.hex ? normalizeHex(String(r.hex)) : undefined,
      image: r.image ? String(r.image) : undefined,
      sizes,
    });
  }

  return { v: 2, sizePrices, colors };
}

export function parseVariantsJson(
  value: string | null | undefined,
  fallbackPrice = 0
): ProductVariantsData {
  if (!value?.trim()) return emptyVariants();
  try {
    const parsed = JSON.parse(value);

    // v2 object
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const obj = parsed as Record<string, unknown>;
      if (Array.isArray(obj.colors)) {
        const sizePricesRaw =
          obj.sizePrices && typeof obj.sizePrices === "object" && !Array.isArray(obj.sizePrices)
            ? (obj.sizePrices as Record<string, unknown>)
            : {};
        const sizePrices: Record<string, number> = {};
        for (const [k, v] of Object.entries(sizePricesRaw)) {
          const size = String(k).trim();
          if (!size) continue;
          const p = Number(v);
          sizePrices[size] = Number.isFinite(p) && p >= 0 ? p : fallbackPrice;
        }
        const colors = parseColorFirstArray(obj.colors as unknown[], fallbackPrice).colors;
        // Ensure every size used in colors has a price entry
        for (const c of colors) {
          for (const s of c.sizes) {
            if (!(s.size in sizePrices)) sizePrices[s.size] = fallbackPrice;
          }
        }
        return { v: 2, sizePrices, colors };
      }
    }

    if (Array.isArray(parsed) && parsed.length > 0) {
      const first = parsed[0];
      // v1: size → colors
      if (first && typeof first === "object" && "size" in first && Array.isArray(first.colors)) {
        return migrateV1ToV2(parseV1Array(parsed));
      }
      // color-first array without wrapper
      if (first && typeof first === "object" && "nameFr" in first && Array.isArray(first.sizes)) {
        return parseColorFirstArray(parsed, fallbackPrice);
      }
    }

    return emptyVariants();
  } catch {
    return emptyVariants();
  }
}

/** Build variants from legacy product fields (pre-variants schema). */
export function legacyToVariants(product: {
  price: number;
  stock: number;
  sizes?: string | null;
  colors?: string | null;
}): ProductVariantsData {
  const sizes = parseJsonArray(product.sizes ?? "[]");
  const sizeList = sizes.length > 0 ? sizes : ["Unique"];
  const colors = parseJsonColors(product.colors ?? "[]");
  const colorList =
    colors.length > 0
      ? colors
      : [{ nameFr: "Standard", nameAr: "Standard", hex: "#888888" as string | undefined, image: undefined as string | undefined }];

  const combos = Math.max(1, sizeList.length * colorList.length);
  const base = Math.floor(Math.max(0, product.stock) / combos);
  let remainder = Math.max(0, product.stock) - base * combos;

  const sizePrices: Record<string, number> = {};
  for (const size of sizeList) sizePrices[size] = product.price;

  const colorVariants: ColorVariant[] = colorList.map((c) => ({
    nameFr: c.nameFr || "Standard",
    nameAr: c.nameAr || c.nameFr || "Standard",
    hex: c.hex,
    image: c.image,
    sizes: sizeList.map((size) => {
      const extra = remainder > 0 ? 1 : 0;
      if (remainder > 0) remainder -= 1;
      return { size, stock: base + extra };
    }),
  }));

  return { v: 2, sizePrices, colors: colorVariants };
}

export function getProductVariants(product: {
  price: number;
  stock: number;
  sizes?: string | null;
  colors?: string | null;
  variants?: string | null;
}): ProductVariantsData {
  const parsed = parseVariantsJson(product.variants, product.price);
  if (parsed.colors.length > 0 || Object.keys(parsed.sizePrices).length > 0) {
    return parsed;
  }
  return legacyToVariants(product);
}

export function totalVariantStock(data: ProductVariantsData | ColorVariant[]): number {
  const colors = Array.isArray(data) ? data : data.colors;
  return colors.reduce(
    (sum, color) => sum + color.sizes.reduce((s, sz) => s + Math.max(0, sz.stock), 0),
    0
  );
}

export function sizeLabels(data: ProductVariantsData): string[] {
  const set = new Set<string>();
  for (const size of Object.keys(data.sizePrices)) {
    if (size.trim()) set.add(size.trim());
  }
  for (const color of data.colors) {
    for (const s of color.sizes) {
      if (s.size.trim()) set.add(s.size.trim());
    }
  }
  return [...set];
}

export function uniqueColorsFromVariants(data: ProductVariantsData): ColorEntry[] {
  return data.colors.map((c) => ({
    nameFr: c.nameFr,
    nameAr: c.nameAr,
    hex: c.hex,
    image: c.image,
  }));
}

export function findColorVariant(
  data: ProductVariantsData,
  colorLabel?: string | null
): ColorVariant | undefined {
  if (!data.colors.length) return undefined;
  if (!colorLabel?.trim()) return data.colors[0];
  const needle = colorLabel.trim().toLowerCase();
  return (
    data.colors.find(
      (c) => c.nameFr.toLowerCase() === needle || c.nameAr.toLowerCase() === needle
    ) ?? undefined
  );
}

export function getSizesForColor(
  data: ProductVariantsData,
  colorLabel?: string | null
): ColorSizeStock[] {
  return findColorVariant(data, colorLabel)?.sizes ?? [];
}

export function getColorsForSize(data: ProductVariantsData, size: string): ColorVariant[] {
  const needle = size.trim().toLowerCase();
  return data.colors.filter((c) =>
    c.sizes.some((s) => s.size.toLowerCase() === needle && s.stock >= 0)
  );
}

export function getVariantStock(
  data: ProductVariantsData,
  size: string,
  colorLabel?: string | null
): number {
  const color = findColorVariant(data, colorLabel);
  if (!color) return 0;
  const needle = size.trim().toLowerCase();
  return color.sizes.find((s) => s.size.toLowerCase() === needle)?.stock ?? 0;
}

export function getSizeBasePrice(
  data: ProductVariantsData,
  size: string,
  fallback: number
): number {
  const key = Object.keys(data.sizePrices).find((k) => k.toLowerCase() === size.trim().toLowerCase());
  if (key != null) {
    const p = data.sizePrices[key];
    if (Number.isFinite(p) && p >= 0) return p;
  }
  return fallback;
}

/** Apply product-level promo to a size price (proportional if base price exists). */
export function getEffectiveSizePrice(
  product: { price: number; onPromo?: boolean; promoPrice?: number | null },
  sizePrice: number
): number {
  if (product.onPromo && product.promoPrice != null && product.promoPrice > 0) {
    if (product.price > 0) {
      const ratio = product.promoPrice / product.price;
      return Math.round(sizePrice * ratio);
    }
    return product.promoPrice;
  }
  return sizePrice;
}

export function minVariantPrice(data: ProductVariantsData, fallback: number): number {
  const prices = Object.values(data.sizePrices).filter((p) => Number.isFinite(p) && p >= 0);
  if (prices.length === 0) return fallback;
  return Math.min(...prices);
}

export function allSizesShareSamePrice(data: ProductVariantsData): boolean {
  const prices = Object.values(data.sizePrices);
  if (prices.length <= 1) return true;
  const first = prices[0];
  return prices.every((p) => Math.abs(p - first) < 0.01);
}

export function decrementVariantStock(
  data: ProductVariantsData,
  size: string,
  colorLabel: string | undefined,
  quantity: number
): ProductVariantsData | null {
  const next: ProductVariantsData = {
    v: 2,
    sizePrices: { ...data.sizePrices },
    colors: data.colors.map((c) => ({
      ...c,
      sizes: c.sizes.map((s) => ({ ...s })),
    })),
  };
  const color = findColorVariant(next, colorLabel);
  if (!color) return null;
  const needle = size.trim().toLowerCase();
  const sizeRow = color.sizes.find((s) => s.size.toLowerCase() === needle);
  if (!sizeRow || sizeRow.stock < quantity) return null;
  sizeRow.stock -= quantity;
  return next;
}

export function incrementVariantStock(
  data: ProductVariantsData,
  size: string,
  colorLabel: string | undefined,
  quantity: number
): ProductVariantsData | null {
  const next: ProductVariantsData = {
    v: 2,
    sizePrices: { ...data.sizePrices },
    colors: data.colors.map((c) => ({
      ...c,
      sizes: c.sizes.map((s) => ({ ...s })),
    })),
  };
  const color = findColorVariant(next, colorLabel);
  if (!color) return null;
  const needle = size.trim().toLowerCase();
  const sizeRow = color.sizes.find((s) => s.size.toLowerCase() === needle);
  if (!sizeRow) return null;
  sizeRow.stock += Math.max(0, quantity);
  return next;
}

/** Legacy columns kept in sync for listings / older code paths. */
export function legacyFieldsFromVariants(
  data: ProductVariantsData,
  useSinglePrice: boolean,
  singlePrice: number
): {
  sizes: string;
  colors: string;
  stock: number;
  price: number;
  variants: string;
} {
  const sizePrices: Record<string, number> = {};
  const allSizes = sizeLabels(data);
  for (const size of allSizes) {
    sizePrices[size] = useSinglePrice
      ? singlePrice
      : getSizeBasePrice(data, size, singlePrice);
  }

  const normalized: ProductVariantsData = {
    v: 2,
    sizePrices,
    colors: data.colors.map((c) => ({
      ...c,
      sizes: c.sizes.filter((s) => s.size.trim()),
    })),
  };

  return {
    sizes: JSON.stringify(allSizes),
    colors: JSON.stringify(uniqueColorsFromVariants(normalized)),
    stock: totalVariantStock(normalized),
    price: useSinglePrice ? singlePrice : minVariantPrice(normalized, singlePrice),
    variants: JSON.stringify(normalized),
  };
}

export function sanitizeVariantsPayload(
  input: unknown,
  options: { useSinglePrice: boolean; singlePrice: number }
): ProductVariantsData {
  // Accept full v2 object, color array, or legacy size array
  let data: ProductVariantsData;

  if (input && typeof input === "object" && !Array.isArray(input) && Array.isArray((input as ProductVariantsData).colors)) {
    data = parseVariantsJson(JSON.stringify(input), options.singlePrice);
  } else if (Array.isArray(input)) {
    data = parseVariantsJson(JSON.stringify(input), options.singlePrice);
  } else {
    return emptyVariants();
  }

  // Sanitize colors
  const colors: ColorVariant[] = [];
  for (const c of data.colors) {
    const nameFr = c.nameFr.trim().slice(0, 80);
    if (!nameFr) continue;
    const sizes: ColorSizeStock[] = [];
    for (const s of c.sizes) {
      const size = s.size.trim().slice(0, 40);
      if (!size) continue;
      sizes.push({
        size,
        stock: Math.max(0, Math.floor(s.stock) || 0),
      });
    }
    if (sizes.length === 0) continue;
    colors.push({
      nameFr,
      nameAr: (c.nameAr.trim() || nameFr).slice(0, 80),
      hex: c.hex ? normalizeHex(c.hex.slice(0, 20)) : undefined,
      image: c.image?.trim().slice(0, 500) || undefined,
      sizes,
    });
  }

  const sizePrices: Record<string, number> = {};
  const allSizes = new Set<string>();
  for (const c of colors) for (const s of c.sizes) allSizes.add(s.size);

  for (const size of allSizes) {
    if (options.useSinglePrice) {
      sizePrices[size] = options.singlePrice;
    } else {
      sizePrices[size] = getSizeBasePrice(
        { v: 2, sizePrices: data.sizePrices, colors },
        size,
        options.singlePrice
      );
    }
  }

  // Merge any explicit sizePrices from payload for sizes present
  if (!options.useSinglePrice) {
    for (const [k, v] of Object.entries(data.sizePrices)) {
      const size = k.trim();
      if (!allSizes.has(size)) continue;
      if (Number.isFinite(v) && v >= 0) sizePrices[size] = v;
    }
  }

  return { v: 2, sizePrices, colors };
}

/** @deprecated Use ProductVariantsData — kept for gradual migration of call sites. */
export type SizeVariant = SizeVariantV1;
export type VariantColor = SizeVariantV1["colors"][number];

/** Size-centric view for storefront helpers that still expect size rows. */
export function toSizeCentricView(data: ProductVariantsData): SizeVariantV1[] {
  return sizeLabels(data).map((size) => ({
    size,
    price: getSizeBasePrice(data, size, 0),
    colors: data.colors
      .filter((c) => c.sizes.some((s) => s.size === size))
      .map((c) => {
        const row = c.sizes.find((s) => s.size === size)!;
        return {
          nameFr: c.nameFr,
          nameAr: c.nameAr,
          hex: c.hex,
          image: c.image,
          stock: row.stock,
        };
      }),
  }));
}

export function findSizeVariant(
  data: ProductVariantsData | SizeVariantV1[],
  size: string
): SizeVariantV1 | undefined {
  if (Array.isArray(data)) {
    return data.find((v) => v.size === size);
  }
  return toSizeCentricView(data).find((v) => v.size === size);
}
