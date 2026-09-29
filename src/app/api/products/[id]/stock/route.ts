import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";
import { CACHE_TAGS, expireStorefrontCache } from "@/lib/cache-tags";
import { assertSameOrigin } from "@/lib/security";
import { stockReference } from "@/lib/stock-reference";

export async function POST(
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
  const current = await prisma.product.findUnique({ where: { id } });
  if (!current) {
    return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
  }

  const reference = await stockReference(
    current.reference || "",
    current.nameFr,
    !current.reference,
    id,
  );

  const product = await prisma.product.update({
    where: { id },
    data: { inStockApp: true, reference },
  });

  expireStorefrontCache(CACHE_TAGS.products);
  return NextResponse.json(product);
}
