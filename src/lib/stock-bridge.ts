import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { CACHE_TAGS, expireStorefrontCache } from "@/lib/cache-tags";
import { sanitizeText } from "@/lib/security";
import { slugify } from "@/lib/utils";
import { legacyFieldsFromVariants, type ProductVariantsData } from "@/lib/variants";

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
  if (value.startsWith("data:image/") || value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/")) {
    return value;
  }
  return "";
}

function variantsFromBody(body: StockPublishBody, price: number): ProductVariantsData {
  const sizePrices = { ...(body.sizePrices ?? {}) };
  const colors = (body.colors ?? [])
    .map((row) => ({
      nameFr: row.nameFr.trim(),
      nameAr: (row.nameAr || row.nameFr).trim() || row.nameFr.trim(),
      hex: row.hex?.trim() || undefined,
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

  const legacy = legacyFieldsFromVariants(variants, body.uniquePrice !== false, price);
  const images = (body.images ?? []).map(usableImage).filter(Boolean);
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

async function uniqueSlug(nameFr: string, reference: string) {
  const base = slugify(nameFr) || slugify(reference) || "produit";
  let slug = base;
  let suffix = 1;
  while (await prisma.product.findUnique({ where: { slug } })) {
    slug = `${base}-${suffix++}`;
  }
  return slug;
}
