import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";
import { isValidInstagramHandle, normalizeInstagramHandle } from "@/lib/instagram";
import {
  assertSameOrigin,
  getClientIp,
  hashIp,
  isSafeImageUrl,
  rateLimit,
  readJsonBody,
  sanitizeText,
} from "@/lib/security";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const admin = searchParams.get("admin") === "1";

    if (admin) {
      if (!(await isAdminAuthenticated())) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
      }
      const reviews = await prisma.review.findMany({
        include: { product: { select: { nameFr: true, nameAr: true, slug: true } } },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(reviews);
    }

    const reviews = await prisma.review.findMany({
      where: { status: "APPROVED" },
      include: { product: { select: { nameFr: true, nameAr: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json(reviews);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!assertSameOrigin(request)) {
      return NextResponse.json({ error: "Origine non autorisée" }, { status: 403 });
    }

    const ip = getClientIp(request);
    const limit = rateLimit(`review:${hashIp(ip)}`, { limit: 5, windowMs: 30 * 60 * 1000 });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Trop d'avis. Réessayez plus tard." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const parsed = await readJsonBody<{
      customerName?: unknown;
      instagramHandle?: unknown;
      phone?: unknown;
      productId?: unknown;
      message?: unknown;
      rating?: unknown;
      photos?: unknown;
    }>(request, 40_000);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }

    const customerName = sanitizeText(parsed.data.customerName, 120);
    const message = sanitizeText(parsed.data.message, 3000);
    const rating = Number.parseInt(String(parsed.data.rating ?? ""), 10);
    const instagramHandle = parsed.data.instagramHandle
      ? sanitizeText(parsed.data.instagramHandle, 80)
      : null;
    const phone = parsed.data.phone ? sanitizeText(parsed.data.phone, 30) : null;
    const productId = parsed.data.productId ? sanitizeText(parsed.data.productId, 80) : null;

    if (!customerName || !message || !Number.isFinite(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }

    if (instagramHandle && !isValidInstagramHandle(instagramHandle)) {
      return NextResponse.json({ error: "Pseudo Instagram invalide" }, { status: 400 });
    }

    if (productId) {
      const product = await prisma.product.findFirst({ where: { id: productId, active: true } });
      if (!product) {
        return NextResponse.json({ error: "Produit invalide" }, { status: 400 });
      }
    }

    const rawPhotos = Array.isArray(parsed.data.photos) ? parsed.data.photos : [];
    const photos = rawPhotos
      .filter((p): p is string => typeof p === "string")
      .map((p) => p.trim())
      .filter(isSafeImageUrl)
      .slice(0, 5);

    const review = await prisma.review.create({
      data: {
        customerName,
        instagramHandle: instagramHandle ? normalizeInstagramHandle(instagramHandle) : null,
        phone,
        productId,
        message,
        rating,
        photos: JSON.stringify(photos),
        status: "PENDING",
      },
    });

    return NextResponse.json({ id: review.id, status: review.status });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
