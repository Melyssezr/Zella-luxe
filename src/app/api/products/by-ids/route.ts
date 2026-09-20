import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRatingSummary } from "@/lib/utils";

const MAX_IDS = 40;

/**
 * Lightweight product fetch by ids and/or slugs.
 * Used by cart sync + favorites — never loads the full catalog.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0 && id.length <= 40)
    .slice(0, MAX_IDS);
  const slugs = (searchParams.get("slugs") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length <= 120)
    .slice(0, MAX_IDS);
  const lite = searchParams.get("lite") === "1";

  if (ids.length === 0 && slugs.length === 0) {
    return NextResponse.json([]);
  }

  const where = {
    active: true as const,
    OR: [
      ...(ids.length > 0 ? [{ id: { in: ids } }] : []),
      ...(slugs.length > 0 ? [{ slug: { in: slugs } }] : []),
    ],
  };

  if (lite) {
    const products = await prisma.product.findMany({
      where,
      select: {
        id: true,
        slug: true,
        nameFr: true,
        nameAr: true,
        price: true,
        promoPrice: true,
        onPromo: true,
        images: true,
        colors: true,
        sizes: true,
        variants: true,
        stock: true,
        category: true,
        createdAt: true,
        viewCount: true,
        active: true,
      },
    });
    return NextResponse.json(
      products.map((p) => ({ ...p, avgRating: 0, reviewCount: 0 })),
      { headers: { "Cache-Control": "private, max-age=30" } }
    );
  }

  const products = await prisma.product.findMany({
    where,
    select: {
      id: true,
      slug: true,
      nameFr: true,
      nameAr: true,
      price: true,
      promoPrice: true,
      onPromo: true,
      images: true,
      colors: true,
      sizes: true,
      variants: true,
      stock: true,
      category: true,
      createdAt: true,
      viewCount: true,
      active: true,
      reviews: { where: { status: "APPROVED" }, select: { rating: true } },
    },
  });

  const payload = products.map((product) => {
    const { avg, count } = getRatingSummary(product.reviews);
    const { reviews: _reviews, ...rest } = product;
    return {
      ...rest,
      avgRating: avg,
      reviewCount: count,
    };
  });

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "private, max-age=30" },
  });
}
