import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";
import { CACHE_TAGS, expireStorefrontCache } from "@/lib/cache-tags";

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const wilayaId = searchParams.get("wilayaId");

  const offices = await prisma.deliveryOffice.findMany({
    where: wilayaId ? { wilayaId } : undefined,
    orderBy: [{ wilaya: { code: "asc" } }, { nameFr: "asc" }],
    include: { wilaya: { select: { code: true, nameFr: true, nameAr: true } } },
  });

  return NextResponse.json(offices);
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { wilayaId, nameFr, nameAr, active } = await request.json();

  if (!wilayaId || !nameFr?.trim()) {
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
  }

  const office = await prisma.deliveryOffice.create({
    data: {
      wilayaId,
      nameFr: nameFr.trim(),
      nameAr: nameAr?.trim() || nameFr.trim(),
      active: active !== false,
    },
  });

  expireStorefrontCache(CACHE_TAGS.shipping);
  return NextResponse.json(office);
}
