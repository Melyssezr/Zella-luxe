import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { CACHE_TAGS, expireStorefrontCache } from "@/lib/cache-tags";
import { sanitizeText, isAllowedImageMime, looksLikeImageBuffer } from "@/lib/security";
import { resolveColorHex, slugify } from "@/lib/utils";
import { uploadMediaImage } from "@/lib/media-storage";
import { getProductVariants, legacyFieldsFromVariants, type ProductVariantsData } from "@/lib/variants";

const CATEGORY_SLUG: Record<string, string> = {
  sandales: "CHAUSSURES",
  mocassins: "CHAUSSURES",
  escarpins: "TALONS",
  sabot: "CHAUSSURES",
  ballerines: "CHAUSSURES",
  mulles: "CHAUSSURES",
  boots: "CHAUSSURES",
  "compense": "CHAUSSURES",
  "compensé": "CHAUSSURES",
  basket: "CHAUSSURES",
  sacs: "SACS",
  pochettes: "POCHETTES",
  valises: "VALISES",
  lunettes: "LUNETTES",
  "coque de telephone": "POCHETTES",
  "coque de téléphone": "POCHETTES",
  "porte feuille": "POCHETTES",
  portefeuille: "POCHETTES",
};

export type StockPublishBody = {
  reference: string;
  nameFr: string;
  nameAr?: string;
  descriptionFr?: string;
  descriptionAr?: string;
  category: string;
  price: number;
  uniquePrice?: boolean;
  sizePrices?: Record<string, number>;
  onPromo?: boolean;
  promoPrice?: number;
  featured?: boolean;
  images?: string[];
  colors?: Array<{
    nameFr: string;
    nameAr?: string;
    hex?: string;
    photo?: string;
    sizes: Array<{ size: string; qty: number }>;
  }>;
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

export function stockBridgePreflight() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export function jsonWithCors(data: unknown, status = 200) {
  return Response.json(data, { status, headers: corsHeaders() });
}

export function authorizeStockBridge(request: Request) {
  const expected = process.env.ZELLA_STOCK_KEY?.trim();
  if (!expected) {
    return process.env.NODE_ENV === "production" ? false : true;
  }
  const header = request.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token || token.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

function normalizeCategoryKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

async function resolveCatalogSlug(label: string) {
  const catalogs = await prisma.catalog.findMany({ where: { active: true } });
  const raw = label.trim();
  const key = normalizeCategoryKey(raw);
  const match = catalogs.find((item) => {
    return (
      normalizeCategoryKey(item.nameFr) === key ||
      normalizeCategoryKey(item.slug) === key ||
      item.slug.toUpperCase() === raw.toUpperCase()
    );
  });
  if (match) return match.slug;
  const mapped = CATEGORY_SLUG[key] ?? CATEGORY_SLUG[raw.toLowerCase()];
  if (mapped && catalogs.some((item) => item.slug === mapped)) return mapped;
  return catalogs[0]?.slug ?? null;
}

function usableImage(src?: string) {
  const value = src?.trim() ?? "";
  if (!value) return "";
  if (value.startsWith("data:image/")) return value;
  if (value.startsWith("https://") || value.startsWith("http://")) {
    return /localhost|127\.0\.0\.1/i.test(value) ? "" : value;
  }
  if (/^\/(media|uploads|images|products)\//.test(value)) return value;
  return "";
}

async function persistStockImage(src?: string) {
  const value = usableImage(src);
  if (!value) return "";
  if (value.startsWith("data:image/")) {
    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/.exec(value);
    if (!match) return "";
    const mime = match[1].toLowerCase() === "image/jpg" ? "image/jpeg" : match[1].toLowerCase();
    if (!isAllowedImageMime(mime)) return "";
    const buffer = Buffer.from(match[2], "base64");
    if (buffer.length > 8 * 1024 * 1024 || !looksLikeImageBuffer(buffer, mime)) return "";
    return uploadMediaImage("products", buffer, mime);
  }
  return value;
}

function variantsFromBody(body: StockPublishBody, price: number): ProductVariantsData {
  const sizePrices = { ...(body.sizePrices ?? {}) };
  const colors = (body.colors ?? [])
    .map((row) => ({
      nameFr: row.nameFr.trim(),
      nameAr: (row.nameAr || row.nameFr).trim() || row.nameFr.trim(),
      hex: resolveColorHex(row.hex, row.nameFr),
      image: usableImage(row.photo) || undefined,
      sizes: row.sizes
        .filter((item) => item.size.trim())
        .map((item) => ({ size: item.size.trim(), stock: Math.max(0, Math.floor(item.qty) || 0) })),
    }))
    .filter((row) => row.nameFr && row.sizes.length > 0);

  const sizes = new Set<string>();
  for (const color of colors) {
    for (const size of color.sizes) sizes.add(size.size);
  }
  if (body.uniquePrice !== false) {
    for (const size of sizes) sizePrices[size] = price;
  }

  return { v: 2, sizePrices, colors };
}

export async function publishStockProduct(body: StockPublishBody) {
  const reference = sanitizeText(body.reference, 120).toUpperCase();
  const nameFr = sanitizeText(body.nameFr, 200);
  if (!reference || !nameFr) {
    return jsonWithCors({ error: "Nom et référence requis." }, 400);
  }

  const catalogSlug = await resolveCatalogSlug(body.category || "");
  if (!catalogSlug) {
    return jsonWithCors({ error: "Aucune catégorie du site ne correspond." }, 400);
  }

  const price = Number(body.price);
  if (!Number.isFinite(price) || price < 0) {
    return jsonWithCors({ error: "Prix invalide." }, 400);
  }

  const variants = variantsFromBody(body, price);
  if (variants.colors.length === 0) {
    return jsonWithCors({ error: "Ajoutez au moins une couleur avec des tailles." }, 400);
  }

  try {
    variants.colors = await Promise.all(
      variants.colors.map(async (color) => ({
        ...color,
        image: color.image ? await persistStockImage(color.image) : undefined,
      }))
    );
  } catch {
    return jsonWithCors({ error: "Impossible d'enregistrer les photos sur le site." }, 500);
  }

  const legacy = legacyFieldsFromVariants(variants, body.uniquePrice !== false, price);
  let images: string[] = [];
  try {
    images = (await Promise.all((body.images ?? []).map(persistStockImage))).filter(Boolean);
  } catch {
    return jsonWithCors({ error: "Impossible d'enregistrer les photos sur le site." }, 500);
  }
  const promoPrice = Number(body.promoPrice);
  const data = {
    nameFr,
    nameAr: sanitizeText(body.nameAr || nameFr, 200) || nameFr,
    descriptionFr: sanitizeText(body.descriptionFr || "", 5000),
    descriptionAr: sanitizeText(body.descriptionAr || "", 5000),
    reference,
    price: legacy.price,
    promoPrice: Number.isFinite(promoPrice) && promoPrice > 0 ? promoPrice : null,
    onPromo: Boolean(body.onPromo),
    category: catalogSlug,
    images: JSON.stringify(images),
    colors: legacy.colors,
    sizes: legacy.sizes,
    variants: legacy.variants,
    stock: legacy.stock,
    featured: Boolean(body.featured),
    active: true,
    inStockApp: true,
  };

  const existing = await prisma.product.findFirst({ where: { reference } });
  const product = existing
    ? await prisma.product.update({ where: { id: existing.id }, data })
    : await prisma.product.create({
        data: {
          ...data,
          slug: await uniqueSlug(nameFr, reference),
        },
      });

  expireStorefrontCache(CACHE_TAGS.products);
  return jsonWithCors({ id: product.id, reference, published: true, active: true });
}

export async function unpublishStockProduct(referenceRaw: string) {
  const reference = sanitizeText(referenceRaw, 120).toUpperCase();
  if (!reference) {
    return jsonWithCors({ error: "Référence requise." }, 400);
  }

  const existing = await prisma.product.findFirst({ where: { reference } });
  if (existing) {
    await prisma.product.update({
      where: { id: existing.id },
      data: { active: false },
    });
    expireStorefrontCache(CACHE_TAGS.products);
    return jsonWithCors({ id: existing.id, reference, published: false, active: false });
  }

  return jsonWithCors({ reference, published: false, active: false, missing: true });
}

export async function unlistStockProduct(referenceRaw: string) {
  const reference = sanitizeText(referenceRaw, 120).toUpperCase();
  if (!reference) {
    return jsonWithCors({ error: "Référence requise." }, 400);
  }

  const existing = await prisma.product.findFirst({ where: { reference } });
  if (existing) {
    await prisma.product.update({
      where: { id: existing.id },
      data: { inStockApp: false },
    });
    expireStorefrontCache(CACHE_TAGS.products);
    return jsonWithCors({ id: existing.id, reference, inStockApp: false });
  }

  return jsonWithCors({ reference, inStockApp: false, missing: true });
}

async function uniqueSlug(nameFr: string, reference: string) {
  const base = slugify(nameFr) || slugify(reference) || "produit";
  let slug = base;
  let suffix = 1;
  while (await prisma.product.findUnique({ where: { slug } })) {
    slug = `${base}-${suffix++}`;
  }
  return slug;
}

function parseImages(raw: string | null | undefined) {
  try {
    const parsed = JSON.parse(raw || "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
  } catch {
    return [];
  }
}

export type StockQtyItem = {
  reference: string;
  colors: Array<{
    nameFr: string;
    sizes: Array<{ size: string; qty: number }>;
  }>;
};

export async function pullStockCatalog() {
  const products = await prisma.product.findMany({ orderBy: { updatedAt: "desc" } });
  return jsonWithCors({
    at: Date.now(),
    products: products
      .filter((item) => item.reference?.trim())
      .map((item) => {
        const variants = getProductVariants(item);
        const images = parseImages(item.images);
        return {
          id: item.id,
          reference: item.reference!.trim().toUpperCase(),
          active: item.active,
          nameFr: item.nameFr,
          nameAr: item.nameAr,
          descriptionFr: item.descriptionFr,
          descriptionAr: item.descriptionAr,
          category: item.category,
          price: item.price,
          uniquePrice: true,
          sizePrices: variants.sizePrices,
          onPromo: item.onPromo,
          promoPrice: item.promoPrice ?? 0,
          featured: item.featured,
          inStockApp: item.inStockApp,
          images,
          colors: variants.colors.map((color) => ({
            nameFr: color.nameFr,
            nameAr: color.nameAr,
            hex: color.hex,
            photo: color.image || "",
            sizes: color.sizes.map((size) => ({ size: size.size, qty: size.stock })),
          })),
        };
      }),
  });
}

export async function updateStockQuantities(items: StockQtyItem[]) {
  let updated = 0;
  for (const item of items) {
    const reference = sanitizeText(item.reference, 120).toUpperCase();
    if (!reference) continue;
    const existing = await prisma.product.findFirst({ where: { reference } });
    if (!existing) continue;
    const variants = getProductVariants(existing);
    const incoming = new Map(
      (item.colors ?? []).map((color) => [color.nameFr.trim().toLowerCase(), color]),
    );
    for (const color of variants.colors) {
      const next = incoming.get(color.nameFr.trim().toLowerCase());
      if (!next) continue;
      const sizes = new Map(next.sizes.map((row) => [row.size.trim().toLowerCase(), Math.max(0, Math.floor(row.qty) || 0)]));
      for (const size of color.sizes) {
        const qty = sizes.get(size.size.trim().toLowerCase());
        if (qty != null) size.stock = qty;
      }
    }
    const legacy = legacyFieldsFromVariants(variants, true, existing.price);
    await prisma.product.update({
      where: { id: existing.id },
      data: {
        variants: legacy.variants,
        stock: legacy.stock,
        colors: legacy.colors,
        sizes: legacy.sizes,
      },
    });
    updated += 1;
  }
  if (updated) expireStorefrontCache(CACHE_TAGS.products);
  return jsonWithCors({ ok: true, updated });
}
