import type { Order, Prisma } from "@prisma/client";
import {
  decrementVariantStock,
  getProductVariants,
  incrementVariantStock,
  sizeLabels,
  totalVariantStock,
} from "@/lib/variants";

type OrderItem = {
  productId?: string;
  quantity?: number;
  size?: string;
  color?: string;
  nameFr?: string;
  available?: boolean;
};

const STOCK_DEDUCTED_STATUSES = new Set(["CONFIRMED", "SHIPPED", "DELIVERED"]);

export class OrderStockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderStockError";
  }
}

function parseOrderItems(raw: string): OrderItem[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function reconcileOrderStock(
  tx: Prisma.TransactionClient,
  order: Pick<Order, "items" | "stockManaged" | "stockDeducted">,
  nextStatus: string
): Promise<boolean> {
  if (!order.stockManaged) return order.stockDeducted;

  const shouldBeDeducted = STOCK_DEDUCTED_STATUSES.has(nextStatus);
  if (shouldBeDeducted === order.stockDeducted) return order.stockDeducted;

  const items = parseOrderItems(order.items);
  if (items.length === 0) {
    throw new OrderStockError("Articles de la commande invalides");
  }

  for (const item of items) {
    if (item.available === false) continue;

    const productId = item.productId?.trim();
    const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
    if (!productId) {
      throw new OrderStockError("Produit manquant dans la commande");
    }

    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new OrderStockError(`Produit introuvable : ${item.nameFr || productId}`);
    }

    const variants = getProductVariants(product);
    const size = item.size?.trim() || sizeLabels(variants)[0] || "Unique";
    const nextVariants = shouldBeDeducted
      ? decrementVariantStock(variants, size, item.color, quantity)
      : incrementVariantStock(variants, size, item.color, quantity);

    if (!nextVariants) {
      const detail = [size, item.color].filter(Boolean).join(" · ");
      throw new OrderStockError(
        shouldBeDeducted
          ? `Stock insuffisant pour ${item.nameFr || product.nameFr}${detail ? ` (${detail})` : ""}`
          : `Impossible de restituer le stock de ${item.nameFr || product.nameFr}${detail ? ` (${detail})` : ""}`
      );
    }

    const updated = await tx.product.updateMany({
      where: {
        id: product.id,
        variants: product.variants,
        ...(shouldBeDeducted ? { stock: { gte: quantity } } : {}),
      },
      data: {
        stock: totalVariantStock(nextVariants),
        variants: JSON.stringify(nextVariants),
      },
    });

    if (updated.count !== 1) {
      throw new OrderStockError(
        "Le stock a changé pendant l’opération. Réessayez."
      );
    }
  }

  return shouldBeDeducted;
}
