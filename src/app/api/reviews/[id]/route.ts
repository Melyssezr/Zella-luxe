import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";
import { CACHE_TAGS, expireStorefrontCache } from "@/lib/cache-tags";
import { collectReviewPhotoUrls } from "@/lib/cloudinary";
import { deleteMediaImages } from "@/lib/media-storage";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const { status } = await request.json();

  if (!["APPROVED", "REJECTED", "PENDING"].includes(status)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  const review = await prisma.review.update({
    where: { id },
    data: { status },
  });

  expireStorefrontCache(CACHE_TAGS.reviews);
  return NextResponse.json(review);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) {
    return NextResponse.json({ error: "Avis introuvable" }, { status: 404 });
  }

  await deleteMediaImages(collectReviewPhotoUrls(review.photos));

  await prisma.review.delete({ where: { id } });
  expireStorefrontCache(CACHE_TAGS.reviews);
  return NextResponse.json({ ok: true });
}
