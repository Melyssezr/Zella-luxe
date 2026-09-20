import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";
import { CACHE_TAGS, expireStorefrontCache } from "@/lib/cache-tags";
import { assertSameOrigin, readJsonBody, sanitizeText } from "@/lib/security";
import { OrderStockError, reconcileOrderStock } from "@/lib/order-stock";

const ALLOWED_STATUSES = new Set([
  "PENDING",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
]);

type StoredOrderItem = {
  quantity?: number;
  price?: number;
  available?: boolean;
  [key: string]: unknown;
};

function parseStoredItems(raw: string): StoredOrderItem[] | null {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function PATCH(
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
  const safeId = sanitizeText(id, 80);
  if (!safeId) {
    return NextResponse.json({ error: "Commande invalide" }, { status: 400 });
  }

  const parsed = await readJsonBody<{
    status?: unknown;
    itemAvailability?: { index?: unknown; available?: unknown };
  }>(request, 4_000);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const availability = parsed.data.itemAvailability;
  if (availability && typeof availability === "object") {
    const index = Number(availability.index);
    if (!Number.isInteger(index) || index < 0 || typeof availability.available !== "boolean") {
      return NextResponse.json({ error: "Disponibilité invalide" }, { status: 400 });
    }
    const available = availability.available;

    try {
      const order = await prisma.$transaction(async (tx) => {
        const current = await tx.order.findUnique({ where: { id: safeId } });
        if (!current) throw new Error("ORDER_NOT_FOUND");
        if (current.status !== "PENDING" || current.stockDeducted) {
          throw new Error("ORDER_AVAILABILITY_LOCKED");
        }

        const items = parseStoredItems(current.items);
        if (!items || !items[index]) throw new Error("ORDER_ITEM_NOT_FOUND");
        items[index] = { ...items[index], available };

        let subtotal = 0;
        let hasAvailableItem = false;
        for (const item of items) {
          if (item.available === false) continue;
          hasAvailableItem = true;
          const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
          const price = Math.max(0, Number(item.price) || 0);
          subtotal += price * quantity;
        }
        subtotal = Math.round(subtotal);
        const total = subtotal + (hasAvailableItem ? current.shippingCost : 0);

        return tx.order.update({
          where: { id: safeId },
          data: {
            items: JSON.stringify(items),
            subtotal,
            total,
          },
        });
      });
      return NextResponse.json(order);
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      if (code === "ORDER_AVAILABILITY_LOCKED") {
        return NextResponse.json(
          { error: "La disponibilité se modifie avant la confirmation de la commande." },
          { status: 409 }
        );
      }
      if (code === "ORDER_ITEM_NOT_FOUND") {
        return NextResponse.json({ error: "Article introuvable" }, { status: 404 });
      }
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }
  }

  const status = sanitizeText(parsed.data.status, 40).toUpperCase();
  if (!ALLOWED_STATUSES.has(status)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      const current = await tx.order.findUnique({ where: { id: safeId } });
      if (!current) throw new Error("ORDER_NOT_FOUND");

      const stockDeducted = await reconcileOrderStock(tx, current, status);
      return tx.order.update({
        where: { id: safeId },
        data: { status, stockDeducted },
      });
    });
    expireStorefrontCache(CACHE_TAGS.products);
    return NextResponse.json(order);
  } catch (err) {
    if (err instanceof OrderStockError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }
}

export async function DELETE(
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
  const safeId = sanitizeText(id, 80);
  if (!safeId) {
    return NextResponse.json({ error: "Commande invalide" }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: safeId } });
      if (!order) throw new Error("ORDER_NOT_FOUND");
      await reconcileOrderStock(tx, order, "CANCELLED");
      await tx.order.delete({ where: { id: safeId } });
    });
    expireStorefrontCache(CACHE_TAGS.products);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof OrderStockError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }
}
