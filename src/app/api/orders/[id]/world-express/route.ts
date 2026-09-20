import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";
import { CACHE_TAGS, expireStorefrontCache } from "@/lib/cache-tags";
import { assertSameOrigin, readJsonBody, sanitizeText } from "@/lib/security";
import { OrderStockError, reconcileOrderStock } from "@/lib/order-stock";
import {
  buildProductSummary,
  createWorldExpressParcel,
  fetchWorldExpressCommunes,
  getWorldExpressConfig,
  isWorldExpressConfigured,
} from "@/lib/world-express";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }

  const communes = await fetchWorldExpressCommunes(order.wilayaCode);
  return NextResponse.json({
    orderId: order.id,
    wilayaCode: order.wilayaCode,
    currentCommune: order.commune,
    communes: communes.ok ? communes.communes : [],
    communesError: communes.ok ? null : communes.error,
  });
}

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

  if (!isWorldExpressConfigured()) {
    return NextResponse.json(
      {
        error:
          "World Express non configuré. Ajoutez WORLD_EXPRESS_TOKEN dans les variables Vercel.",
      },
      { status: 503 }
    );
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }

  if (order.trackingNumber) {
    return NextResponse.json(
      {
        error: "Expédition déjà créée",
        trackingNumber: order.trackingNumber,
      },
      { status: 409 }
    );
  }

  if (order.status === "CANCELLED") {
    return NextResponse.json({ error: "Commande annulée" }, { status: 400 });
  }

  const parsed = await readJsonBody<{ commune?: unknown }>(request, 4_000);
  const bodyCommune =
    parsed.ok && parsed.data.commune != null
      ? sanitizeText(parsed.data.commune, 120)
      : "";

  let items: Array<{
    nameFr?: string;
    quantity?: number;
    size?: string;
    color?: string;
    available?: boolean;
  }> = [];
  try {
    const raw = JSON.parse(order.items);
    if (Array.isArray(raw)) items = raw.filter((item) => item?.available !== false);
  } catch {
    /* ignore */
  }

  const commune =
    bodyCommune ||
    order.commune?.trim() ||
    "";

  if (!commune || commune.toLowerCase().includes("bureau")) {
    return NextResponse.json(
      {
        error:
          "Indiquez une commune officielle World Express (ex. Adrar). Le nom du bureau ne convient pas.",
      },
      { status: 400 }
    );
  }

  const isOffice = order.deliveryMethod === "OFFICE";
  const address = isOffice
    ? `Stop desk: ${order.deliveryOfficeName ?? "Bureau"} — ${order.deliveryAddress ?? order.address}`
    : order.deliveryAddress?.trim() || order.address;

  const noteParts = [
    order.notes?.trim(),
    isOffice ? `Retrait bureau Zella: ${order.deliveryOfficeName ?? ""}` : "",
  ].filter(Boolean);

  // Résoudre le code station Ecotrack si disponible (optionnel)
  let stopDeskId: string | undefined;
  if (isOffice && order.deliveryOfficeId) {
    const office = await prisma.deliveryOffice.findUnique({
      where: { id: order.deliveryOfficeId },
      select: { stationCode: true },
    });
    const stationCode = office?.stationCode?.trim();
    if (stationCode) stopDeskId = stationCode;
  }

  const shouldRollbackStock =
    order.stockManaged &&
    !order.stockDeducted &&
    order.status === "PENDING";

  let preparedOrder = order;
  try {
    preparedOrder = await prisma.$transaction(async (tx) => {
      const current = await tx.order.findUnique({ where: { id: order.id } });
      if (!current) throw new Error("ORDER_NOT_FOUND");
      const stockDeducted = await reconcileOrderStock(tx, current, "CONFIRMED");
      return tx.order.update({
        where: { id: current.id },
        data: {
          commune,
          status: current.status === "PENDING" ? "CONFIRMED" : current.status,
          stockDeducted,
        },
      });
    });
  } catch (err) {
    if (err instanceof OrderStockError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Impossible de confirmer la commande" }, { status: 500 });
  }

  const result = await createWorldExpressParcel({
    reference: preparedOrder.orderNumber,
    customerName: preparedOrder.customerName,
    phone: preparedOrder.phone,
    address: address.slice(0, 255),
    commune,
    wilayaCode: preparedOrder.wilayaCode,
    amount: preparedOrder.total,
    productSummary: buildProductSummary(items),
    note: noteParts.join(" | ").slice(0, 255),
    deliveryMethod: isOffice ? "OFFICE" : "HOME",
    stopDeskId,
  });

  if (!result.ok) {
    await prisma.$transaction(async (tx) => {
      const current = await tx.order.findUnique({ where: { id: order.id } });
      if (!current) return;
      const stockDeducted = shouldRollbackStock
        ? await reconcileOrderStock(tx, current, "PENDING")
        : current.stockDeducted;
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: shouldRollbackStock ? "PENDING" : current.status,
          stockDeducted,
          shippingError: result.error.slice(0, 500),
          shippingProvider: "WORLD_EXPRESS",
        },
      });
    });
    expireStorefrontCache(CACHE_TAGS.products);
    return NextResponse.json({ error: result.error, details: result.raw }, { status: 502 });
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      trackingNumber: result.tracking,
      shippingProvider: "WORLD_EXPRESS",
      shippingError: null,
      commune,
      status: preparedOrder.status,
    },
  });
  expireStorefrontCache(CACHE_TAGS.products);

  return NextResponse.json({
    ok: true,
    trackingNumber: result.tracking,
    order: updated,
    config: { baseUrl: getWorldExpressConfig()?.baseUrl },
  });
}
