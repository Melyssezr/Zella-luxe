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
  const { homeShippingPrice, officeShippingPrice, active } = body;

  const data: Record<string, unknown> = {};
  if (typeof homeShippingPrice === "number") data.homeShippingPrice = homeShippingPrice;
  if (typeof officeShippingPrice === "number") data.officeShippingPrice = officeShippingPrice;
  if (typeof active === "boolean") data.active = active;

  const wilaya = await prisma.wilaya.update({
    where: { id },
    data,
  });

  expireStorefrontCache(CACHE_TAGS.shipping);
  return NextResponse.json(wilaya);
}
