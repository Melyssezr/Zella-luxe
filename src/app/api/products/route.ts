import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";
import { CACHE_TAGS, expireStorefrontCache } from "@/lib/cache-tags";
import { slugify, toStorefrontProduct } from "@/lib/utils";
import { assertSameOrigin, sanitizeText } from "@/lib/security";
import {
  legacyFieldsFromVariants,
  sanitizeVariantsPayload,
} from "@/lib/variants";

const getCachedStorefrontProductsJson = unstable_cache(
  async () => {
    const products = await prisma.product.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        nameFr: true,
        nameAr: true,
        descriptionFr: true,
        descriptionAr: true,
        price: true,
        promoPrice: true,
        onPromo: true,
        category: true,
        images: true,
        colors: true,
        sizes: true,
        variants: true,
        stock: true,
        featured: true,
        active: true,
        viewCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return products.map(toStorefrontProduct);
  },
  ["zella-api-products-storefront-v2"],
  { tags: [CACHE_TAGS.products], revalidate: 60 }
);

export async function GET() {
  if (await isAdminAuthenticated()) {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(products, {
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  const products = await getCachedStorefrontProductsJson();
  return NextResponse.json(products, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ error: "Origine non autorisée" }, { status: 403 });
  }

  const body = await request.json();
  const category = sanitizeText(body.category, 80);
  const catalog = category
    ? await prisma.catalog.findFirst({ where: { slug: category, active: true } })
    : null;
  if (!catalog) {
    return NextResponse.json({ error: "Catalogue invalide" }, { status: 400 });
  }

  const nameFr = sanitizeText(body.nameFr, 200);
  if (!nameFr) {
    return NextResponse.json({ error: "Nom FR requis" }, { status: 400 });
  }

  const baseSlug = slugify(sanitizeText(body.slug, 200) || nameFr) || "produit";
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.product.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix++}`;
  }

  const reference = sanitizeText(body.reference, 120) || null;
  const useSinglePrice = Boolean(body.useSinglePrice ?? true);
  const singlePrice = parseFloat(body.price);
  if (!Number.isFinite(singlePrice) || singlePrice < 0) {
    return NextResponse.json({ error: "Prix invalide" }, { status: 400 });
  }

  const variants = sanitizeVariantsPayload(body.variants, {
    useSinglePrice,
    singlePrice,
  });
  if (variants.colors.length === 0) {
    return NextResponse.json(
      { error: "Ajoutez au moins une couleur avec des tailles / stock" },
      { status: 400 }
    );
  }

  const legacy = legacyFieldsFromVariants(variants, useSinglePrice, singlePrice);

  try {
    const product = await prisma.product.create({
      data: {
        slug,
        nameFr,
        nameAr: sanitizeText(body.nameAr, 200) || nameFr,
        descriptionFr: sanitizeText(body.descriptionFr, 5000),
        descriptionAr: sanitizeText(body.descriptionAr, 5000),
        reference,
        price: legacy.price,
        promoPrice: body.promoPrice ? parseFloat(body.promoPrice) : null,
        onPromo: body.onPromo ?? false,
        category: catalog.slug,
        images: JSON.stringify(body.images ?? []),
        colors: legacy.colors,
        sizes: legacy.sizes,
        variants: legacy.variants,
        stock: legacy.stock,
        featured: body.featured ?? false,
        active: body.active ?? true,
      },
    });

    expireStorefrontCache(CACHE_TAGS.products);
    return NextResponse.json(product, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Impossible de créer le produit" }, { status: 500 });
  }
}
