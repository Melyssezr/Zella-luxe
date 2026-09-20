import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";
import { CACHE_TAGS, expireStorefrontCache } from "@/lib/cache-tags";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { nameFr, nameAr, active } = body;

  const data: Record<string, unknown> = {};
  if (typeof nameFr === "string") data.nameFr = nameFr.trim();
  if (typeof nameAr === "string") data.nameAr = nameAr.trim();
  if (typeof active === "boolean") data.active = active;

  const office = await prisma.deliveryOffice.update({ where: { id }, data });
  expireStorefrontCache(CACHE_TAGS.shipping);
  return NextResponse.json(office);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.deliveryOffice.delete({ where: { id } });
  expireStorefrontCache(CACHE_TAGS.shipping);
  return NextResponse.json({ ok: true });
}
