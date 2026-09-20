import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";
import { CACHE_TAGS, expireStorefrontCache } from "@/lib/cache-tags";
import { getAllCatalogs } from "@/lib/catalogs";
import { assertSameOrigin, isSafeImageUrl, parsePositiveInt, sanitizeText } from "@/lib/security";
import { slugify } from "@/lib/utils";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const catalogs = await getAllCatalogs();
  return NextResponse.json(catalogs);
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ error: "Origine non autorisée" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const nameFr = sanitizeText(body.nameFr, 120);
    const nameAr = sanitizeText(body.nameAr, 120);
    if (!nameFr || !nameAr) {
      return NextResponse.json({ error: "Noms FR et AR requis" }, { status: 400 });
    }

    const requestedSlug = sanitizeText(body.slug, 80);
    const baseSlug = slugify(requestedSlug || nameFr).toUpperCase().replace(/-/g, "_") || "CATALOGUE";
    let slug = baseSlug;
    let suffix = 1;
    while (await prisma.catalog.findUnique({ where: { slug } })) {
      slug = `${baseSlug}_${suffix++}`;
    }

    const coverImage = sanitizeText(body.coverImage, 500);
    if (coverImage && !isSafeImageUrl(coverImage)) {
      return NextResponse.json({ error: "URL d'image invalide" }, { status: 400 });
    }

    const accentColor = sanitizeText(body.accentColor, 20) || "#c9a86c";

    const maxOrder = await prisma.catalog.aggregate({ _max: { sortOrder: true } });
    const catalog = await prisma.catalog.create({
      data: {
        slug,
        nameFr,
        nameAr,
        coverImage,
        accentColor,
        sortOrder: parsePositiveInt(body.sortOrder, (maxOrder._max.sortOrder ?? -1) + 1),
        active: body.active !== false,
      },
    });

    expireStorefrontCache(CACHE_TAGS.catalogs);
    return NextResponse.json(catalog, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
