import escarpin from "./assets/watch-escarpin.png";
import seau from "./assets/watch-seau.png";
import valise from "./assets/watch-valise.png";
import sac from "./assets/watch-sac.png";
import { hexFromColorName } from "./color-hex";

export type StockStatus = "ok" | "bas" | "rupture";

export type CatalogVariant = {
  color: string;
  size: string;
  qty: number;
};

export type CatalogColorInfo = {
  name: string;
  nameAr: string;
  photo: string;
  hex: string;
};

export type CatalogProduct = {
  ref: string;
  name: string;
  nameAr: string;
  price: number;
  cost: number;
  photo: string;
  colors: string[];
  sizes: string[];
  category: string;
  stock: number;
  minStock: number;
  description: string;
  descriptionAr: string;
  designation: string;
  brand: string;
  barcode: string;
  uniquePrice: boolean;
  sizePrices: Record<string, number>;
  onPromo: boolean;
  promoPrice: number;
  featured: boolean;
  colorInfo: CatalogColorInfo[];
  addedAt: number;
  variants: CatalogVariant[];
  published: boolean;
  siteProductId: string;
};

export type ProductDraft = Omit<
  CatalogProduct,
  | "stock" | "cost" | "minStock" | "nameAr" | "description" | "descriptionAr"
  | "designation" | "brand" | "barcode" | "uniquePrice" | "sizePrices"
  | "onPromo" | "promoPrice" | "featured" | "colorInfo" | "addedAt" | "variants"
  | "published" | "siteProductId"
> & {
  stock?: number;
  cost?: number;
  minStock?: number;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  designation?: string;
  brand?: string;
  barcode?: string;
  uniquePrice?: boolean;
  sizePrices?: Record<string, number>;
  onPromo?: boolean;
  promoPrice?: number;
  featured?: boolean;
  colorInfo?: CatalogColorInfo[];
  addedAt?: number;
  variants?: CatalogVariant[];
  published?: boolean;
  siteProductId?: string;
};

function atDay(year: number, month: number, day: number) {
  return new Date(year, month - 1, day).getTime();
}

const SEED: ProductDraft[] = [
  {
    ref: "ESC-001",
    name: "Escarpin Luna",
    price: 6500,
    cost: 3500,
    photo: escarpin,
    colors: ["Noir", "Beige"],
    sizes: ["37", "38", "39"],
    category: "Escarpins",
    minStock: 5,
    description: "Escarpin satin à bout pointu, talon 8 cm. Conçu pour la boutique.",
    addedAt: atDay(2026, 3, 12),
    variants: [
      { color: "Noir", size: "37", qty: 5 },
      { color: "Noir", size: "38", qty: 8 },
      { color: "Noir", size: "39", qty: 3 },
      { color: "Beige", size: "37", qty: 2 },
      { color: "Beige", size: "38", qty: 6 },
    ],
  },
  {
    ref: "SAN-021",
    name: "Sandale Mia",
    price: 4500,
    cost: 2500,
    photo: escarpin,
    colors: ["Beige", "Noir"],
    sizes: ["38", "39", "40"],
    category: "Sandales",
    minStock: 5,
    description: "Sandale fine à bride, semelle confort. Idéale pour la saison.",
    addedAt: atDay(2026, 4, 3),
    variants: [
      { color: "Beige", size: "38", qty: 4 },
      { color: "Beige", size: "39", qty: 3 },
      { color: "Beige", size: "40", qty: 2 },
      { color: "Noir", size: "39", qty: 1 },
    ],
  },
  {
    ref: "SAC-032",
    name: "Sac Élégance",
    price: 7000,
    cost: 4000,
    photo: sac,
    colors: ["Noir", "Bordeaux"],
    sizes: ["Unique"],
    category: "Sacs",
    minStock: 3,
    description: "Sac structuré, fermoir doré. Pièce quotidienne de la collection.",
    addedAt: atDay(2026, 2, 18),
    variants: [
      { color: "Noir", size: "Unique", qty: 0 },
      { color: "Bordeaux", size: "Unique", qty: 2 },
    ],
  },
  {
    ref: "ZL-ESC-12",
    name: "Escarpin satin",
    price: 18900,
    cost: 8200,
    photo: escarpin,
    colors: ["Noir"],
    sizes: ["36", "37", "38", "39", "40", "41"],
    category: "Chaussures",
    minStock: 2,
    description: "Escarpin satin noir, talon aiguille.",
    addedAt: atDay(2025, 11, 8),
    variants: [
      { color: "Noir", size: "36", qty: 0 },
      { color: "Noir", size: "37", qty: 2 },
      { color: "Noir", size: "38", qty: 1 },
      { color: "Noir", size: "39", qty: 0 },
      { color: "Noir", size: "40", qty: 2 },
      { color: "Noir", size: "41", qty: 0 },
    ],
  },
  {
    ref: "ZL-SAC-08",
    name: "Mini seau cuir",
    price: 24500,
    cost: 9800,
    photo: seau,
    colors: ["Noir", "Champagne"],
    sizes: ["Unique"],
    category: "Maroquinerie",
    minStock: 2,
    description: "Mini seau en cuir, anse portée main ou épaule.",
    addedAt: atDay(2025, 12, 2),
    variants: [
      { color: "Noir", size: "Unique", qty: 4 },
      { color: "Champagne", size: "Unique", qty: 1 },
    ],
  },
  {
    ref: "ZL-VAL-03",
    name: "Valise rigide",
    price: 42000,
    cost: 18000,
    photo: valise,
    colors: ["Beige"],
    sizes: ["Cabine", "Grande"],
    category: "Bagage",
    minStock: 2,
    description: "Valise coque rigide, 4 roues, serrure TSA.",
    addedAt: atDay(2026, 1, 20),
    variants: [
      { color: "Beige", size: "Cabine", qty: 2 },
      { color: "Beige", size: "Grande", qty: 1 },
    ],
  },
  {
    ref: "ZL-SAC-02",
    name: "Mini Sac Élégance",
    price: 16800,
    cost: 6200,
    photo: sac,
    colors: ["Noir", "Or"],
    sizes: ["Unique"],
    category: "Maroquinerie",
    minStock: 2,
    description: "Mini sac soirée, finitions dorées.",
    addedAt: atDay(2026, 1, 9),
    variants: [
      { color: "Noir", size: "Unique", qty: 3 },
      { color: "Or", size: "Unique", qty: 0 },
    ],
  },
];

const STORE_KEY = "zella-stock-catalog";

let listeners = new Set<() => void>();
let catalog: CatalogProduct[] = loadCatalog();

function loadCatalog(): CatalogProduct[] {
  try {
    if (typeof localStorage === "undefined") return SEED.map((item) => hydrate(item));
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return SEED.map((item) => hydrate(item));
    const parsed = JSON.parse(raw) as ProductDraft[];
    if (!Array.isArray(parsed) || parsed.length === 0) return SEED.map((item) => hydrate(item));
    return parsed.map((item) => hydrate(item));
  } catch {
    return SEED.map((item) => hydrate(item));
  }
}

function persist() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(catalog));
  } catch {
    /* ignore quota */
  }
}

function emit() {
  persist();
  listeners.forEach((fn) => fn());
}

export function subscribeCatalog(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function hydrate(draft: ProductDraft): CatalogProduct {
  const colors = draft.colors.length ? [...draft.colors] : ["Unique"];
  const sizes = draft.sizes.length ? [...draft.sizes] : ["Unique"];
  let variants = (draft.variants ?? []).map((item) => ({ ...item }));
  if (variants.length === 0) {
    variants = colors.flatMap((color) => sizes.map((size) => ({ color, size, qty: 0 })));
    if (variants[0] && (draft.stock ?? 0) > 0) variants[0].qty = draft.stock ?? 0;
  }
  const product: CatalogProduct = {
    ref: draft.ref.trim().toUpperCase(),
    name: draft.name,
    nameAr: draft.nameAr ?? "",
    price: draft.price,
    cost: draft.cost ?? Math.round(draft.price * 0.45),
    photo: draft.photo,
    colors,
    sizes,
    category: draft.category,
    stock: 0,
    minStock: draft.minStock ?? 2,
    description: draft.description ?? "",
    descriptionAr: draft.descriptionAr ?? "",
    designation: draft.designation ?? "",
    brand: draft.brand ?? "",
    barcode: draft.barcode ?? "",
    uniquePrice: draft.uniquePrice ?? true,
    sizePrices: { ...(draft.sizePrices ?? {}) },
    onPromo: draft.onPromo ?? false,
    promoPrice: draft.promoPrice ?? 0,
    featured: draft.featured ?? false,
    colorInfo: (draft.colorInfo ?? colors.map((name) => ({ name, nameAr: "", photo: "", hex: "" }))).map((item) => ({
      name: item.name,
      nameAr: item.nameAr ?? "",
      photo: item.photo ?? "",
      hex: item.hex || hexFromColorName(item.name) || "",
    })),
    addedAt: draft.addedAt ?? Date.now(),
    variants,
    published: draft.published ?? false,
    siteProductId: draft.siteProductId ?? "",
  };
  return syncDerived(product);
}

function syncDerived(product: CatalogProduct): CatalogProduct {
  product.colors = [...new Set(product.variants.map((item) => item.color).filter(Boolean))];
  product.sizes = [...new Set(product.variants.map((item) => item.size).filter(Boolean))];
  product.stock = product.variants.reduce((sum, item) => sum + item.qty, 0);
  if (product.colors.length === 0) product.colors = ["Unique"];
  if (product.sizes.length === 0) product.sizes = ["Unique"];
  return product;
}

function variantKey(color?: string, size?: string) {
  return `${(color ?? "").trim().toLowerCase()}|${(size ?? "").trim().toLowerCase()}`;
}

function findVariant(product: CatalogProduct, color?: string, size?: string) {
  if (color || size) {
    const key = variantKey(color, size);
    const exact = product.variants.find((item) => variantKey(item.color, item.size) === key);
    if (exact) return exact;
    const byColor = color ? product.variants.find((item) => item.color.toLowerCase() === color.trim().toLowerCase()) : undefined;
    if (byColor) return byColor;
    const bySize = size ? product.variants.find((item) => item.size.toLowerCase() === size.trim().toLowerCase()) : undefined;
    if (bySize) return bySize;
  }
  return product.variants.find((item) => item.qty > 0) ?? product.variants[0];
}

function ensureVariant(product: CatalogProduct, color?: string, size?: string) {
  if (color && size) {
    const key = variantKey(color, size);
    const exact = product.variants.find((item) => variantKey(item.color, item.size) === key);
    if (exact) return exact;
    const created = { color, size, qty: 0 };
    product.variants.push(created);
    return created;
  }
  return findVariant(product, color, size) ?? (() => {
    const created = { color: color || product.colors[0] || "Unique", size: size || product.sizes[0] || "Unique", qty: 0 };
    product.variants.push(created);
    return created;
  })();
}

export function listCatalog(): CatalogProduct[] {
  return catalog;
}

export function findByRef(ref: string): CatalogProduct | undefined {
  const key = ref.trim().toUpperCase();
  if (!key) return undefined;
  return catalog.find((item) => item.ref.toUpperCase() === key);
}

export function searchCatalog(query: string): CatalogProduct[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return catalog.filter((item) => {
    return (
      item.ref.toLowerCase().includes(q) ||
      item.name.toLowerCase().includes(q) ||
      item.nameAr.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.designation.toLowerCase().includes(q) ||
      item.brand.toLowerCase().includes(q) ||
      item.barcode.toLowerCase().includes(q)
    );
  });
}

export function upsertProduct(draft: ProductDraft): CatalogProduct {
  const existing = findByRef(draft.ref);
  if (existing) {
    existing.name = draft.name;
    if (draft.nameAr != null) existing.nameAr = draft.nameAr;
    existing.price = draft.price;
    existing.photo = draft.photo;
    existing.category = draft.category;
    if (draft.cost != null) existing.cost = draft.cost;
    if (draft.minStock != null) existing.minStock = draft.minStock;
    if (draft.description != null) existing.description = draft.description;
    if (draft.descriptionAr != null) existing.descriptionAr = draft.descriptionAr;
    if (draft.designation != null) existing.designation = draft.designation;
    if (draft.brand != null) existing.brand = draft.brand;
    if (draft.barcode != null) existing.barcode = draft.barcode;
    if (draft.uniquePrice != null) existing.uniquePrice = draft.uniquePrice;
    if (draft.sizePrices) existing.sizePrices = { ...draft.sizePrices };
    if (draft.onPromo != null) existing.onPromo = draft.onPromo;
    if (draft.promoPrice != null) existing.promoPrice = draft.promoPrice;
    if (draft.featured != null) existing.featured = draft.featured;
    if (draft.colorInfo) existing.colorInfo = draft.colorInfo.map((item) => ({ ...item }));
    if (draft.published != null) existing.published = draft.published;
    if (draft.siteProductId != null) existing.siteProductId = draft.siteProductId;
    if (draft.variants) existing.variants = draft.variants.map((item) => ({ ...item }));
    else {
      const colors = draft.colors.length ? draft.colors : existing.colors;
      const sizes = draft.sizes.length ? draft.sizes : existing.sizes;
      for (const color of colors) {
        for (const size of sizes) {
          if (!existing.variants.some((item) => item.color === color && item.size === size)) {
            existing.variants.push({ color, size, qty: 0 });
          }
        }
      }
    }
    syncDerived(existing);
    emit();
    return existing;
  }
  const product = hydrate(draft);
  catalog = [product, ...catalog];
  emit();
  return product;
}

export function addStock(ref: string, qty: number, color?: string, size?: string): CatalogProduct | undefined {
  const item = findByRef(ref);
  if (!item || qty <= 0) return undefined;
  const variant = ensureVariant(item, color, size);
  variant.qty += qty;
  syncDerived(item);
  emit();
  return item;
}

export function removeStock(ref: string, qty: number, color?: string, size?: string): CatalogProduct | undefined {
  const item = findByRef(ref);
  if (!item || qty <= 0) return undefined;
  const variant = findVariant(item, color, size);
  if (!variant) return undefined;
  if (color || size) {
    if (variant.qty < qty) return undefined;
    variant.qty -= qty;
  } else {
    if (item.stock < qty) return undefined;
    let left = qty;
    const ordered = [...item.variants].sort((a, b) => b.qty - a.qty);
    for (const row of ordered) {
      if (left <= 0) break;
      const take = Math.min(row.qty, left);
      row.qty -= take;
      left -= take;
    }
  }
  syncDerived(item);
  emit();
  return item;
}

export function applyStockDelta(ref: string, delta: number, color?: string, size?: string): CatalogProduct | undefined {
  const item = findByRef(ref);
  if (!item || delta === 0) return item;
  if (delta > 0) return addStock(ref, delta, color, size);
  return removeStock(ref, Math.abs(delta), color, size) ?? item;
}

export function availableQty(product: CatalogProduct, color?: string, size?: string): number {
  if (color || size) return findVariant(product, color, size)?.qty ?? 0;
  return product.stock;
}

export function variantLabel(variant: CatalogVariant): string {
  if (variant.size && variant.size !== "Unique" && variant.color) return `${variant.size} / ${variant.color}`;
  if (variant.color && variant.size === "Unique") return variant.color;
  return [variant.size, variant.color].filter(Boolean).join(" / ") || "—";
}

export function stockStatus(qty: number, minStock: number): StockStatus {
  if (qty <= 0) return "rupture";
  if (qty <= minStock) return "bas";
  return "ok";
}

export function formatPrice(value: number): string {
  return `${new Intl.NumberFormat("fr-DZ").format(value)} DA`;
}

export function formatAmount(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export function setSitePublish(ref: string, published: boolean, siteProductId = ""): CatalogProduct | undefined {
  const item = findByRef(ref);
  if (!item) return undefined;
  item.published = published;
  if (siteProductId) item.siteProductId = siteProductId;
  if (!published) item.siteProductId = item.siteProductId;
  emit();
  return item;
}
