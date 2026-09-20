import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";
import { CACHE_TAGS, expireStorefrontCache } from "@/lib/cache-tags";
import { DESIGN_ONLY_IMAGES, isDesignOnlyImage } from "@/lib/images";
import { assertSameOrigin, isSafeImageUrl, parsePositiveInt, sanitizeText } from "@/lib/security";

export async function GET() {
  const images = await prisma.galleryImage.findMany({
    where: { url: { notIn: [...DESIGN_ONLY_IMAGES] } },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(images);
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ error: "Origine non autorisée" }, { status: 403 });
  }

  const body = await request.json();
  const url = sanitizeText(body.url, 500);

  if (!url || !isSafeImageUrl(url)) {
    return NextResponse.json({ error: "Image invalide" }, { status: 400 });
  }

  if (isDesignOnlyImage(url)) {
    return NextResponse.json(
      { error: "Cette image est réservée au design du site (background)." },
      { status: 400 }
    );
  }

  const image = await prisma.galleryImage.create({
    data: {
      url,
      captionFr: sanitizeText(body.captionFr, 200) || null,
      captionAr: sanitizeText(body.captionAr, 200) || null,
      sortOrder: parsePositiveInt(body.sortOrder, 0),
      active: body.active !== false,
    },
  });

  expireStorefrontCache(CACHE_TAGS.gallery);
  return NextResponse.json(image);
}
