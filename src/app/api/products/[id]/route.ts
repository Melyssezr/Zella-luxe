import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";
import { CACHE_TAGS, expireStorefrontCache } from "@/lib/cache-tags";
import { assertSameOrigin, sanitizeText } from "@/lib/security";
import { collectProductImageUrls } from "@/lib/cloudinary";
import { deleteMediaImages } from "@/lib/media-storage";
import {
  legacyFieldsFromVariants,
  sanitizeVariantsPayload,
} from "@/lib/variants";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ error: "Origine non autorisée" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const category = sanitizeText(body.category, 80);
  const catalog = category
    ? await prisma.catalog.findFirst({ where: { slug: category, active: true } })
    : null;
  if (!catalog) {
    return NextResponse.json({ error: "Catalogue invalide" }, { status: 400 });
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

  const product = await prisma.product.update({
    where: { id },
    data: {
      nameFr: sanitizeText(body.nameFr, 200),
      nameAr: sanitizeText(body.nameAr, 200),
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
  return NextResponse.json(product);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ error: "Origine non autorisée" }, { status: 403 });
  }

  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
  }

  await deleteMediaImages(
    collectProductImageUrls(product.images, product.colors, product.variants)
  );

  await prisma.product.delete({ where: { id } });
  expireStorefrontCache(CACHE_TAGS.products);
  return NextResponse.json({ ok: true });
}
