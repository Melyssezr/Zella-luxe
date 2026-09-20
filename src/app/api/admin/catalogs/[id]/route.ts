import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";
import { CACHE_TAGS, expireStorefrontCache } from "@/lib/cache-tags";
import { assertSameOrigin, isSafeImageUrl, parsePositiveInt, sanitizeText } from "@/lib/security";
import { deleteMediaImage } from "@/lib/media-storage";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ error: "Origine non autorisée" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.nameFr !== undefined) {
      const nameFr = sanitizeText(body.nameFr, 120);
      if (!nameFr) return NextResponse.json({ error: "Nom FR requis" }, { status: 400 });
      data.nameFr = nameFr;
    }
    if (body.nameAr !== undefined) {
      const nameAr = sanitizeText(body.nameAr, 120);
      if (!nameAr) return NextResponse.json({ error: "Nom AR requis" }, { status: 400 });
      data.nameAr = nameAr;
    }
    if (body.coverImage !== undefined) {
      const coverImage = sanitizeText(body.coverImage, 500);
      if (coverImage && !isSafeImageUrl(coverImage)) {
        return NextResponse.json({ error: "URL d'image invalide" }, { status: 400 });
      }
      data.coverImage = coverImage;
    }
    if (body.accentColor !== undefined) {
      data.accentColor = sanitizeText(body.accentColor, 20) || "#c9a86c";
    }
    if (body.sortOrder !== undefined) {
      data.sortOrder = parsePositiveInt(body.sortOrder, 0);
    }
    if (body.active !== undefined) {
      data.active = Boolean(body.active);
    }

    const catalog = await prisma.catalog.update({ where: { id }, data });
    expireStorefrontCache(CACHE_TAGS.catalogs);
    return NextResponse.json(catalog);
  } catch {
    return NextResponse.json({ error: "Catalogue introuvable" }, { status: 404 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ error: "Origine non autorisée" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const catalog = await prisma.catalog.findUnique({ where: { id } });
    if (!catalog) {
      return NextResponse.json({ error: "Catalogue introuvable" }, { status: 404 });
    }

    const productCount = await prisma.product.count({ where: { category: catalog.slug } });
    if (productCount > 0) {
      return NextResponse.json(
        { error: `Impossible de supprimer : ${productCount} produit(s) utilisent ce catalogue` },
        { status: 400 }
      );
    }

    if (catalog.coverImage) {
      await deleteMediaImage(catalog.coverImage);
    }

    await prisma.catalog.delete({ where: { id } });
    expireStorefrontCache(CACHE_TAGS.catalogs);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
