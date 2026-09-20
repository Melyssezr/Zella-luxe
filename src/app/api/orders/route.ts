import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";
import { generateOrderNumber, getProductImages } from "@/lib/utils";
import {
  assertSameOrigin,
  getClientIp,
  hashIp,
  isValidAlgerianPhone,
  rateLimit,
  readJsonBody,
  sanitizeText,
} from "@/lib/security";
import { getInstagramUrl, normalizeInstagramHandle } from "@/lib/instagram";
import { buildOrderAddress, type DeliveryMethod } from "@/lib/shipping";
import { notifyOwnerNewOrder } from "@/lib/whatsapp";
import {
  getEffectiveSizePrice,
  findColorVariant,
  getProductVariants,
  getSizeBasePrice,
  getVariantStock,
  sizeLabels,
} from "@/lib/variants";

type OrderBody = {
  firstName?: unknown;
  lastName?: unknown;
  phone?: unknown;
  instagramHandle?: unknown;
  wilayaCode?: unknown;
  deliveryMethod?: unknown;
  deliveryAddress?: unknown;
  deliveryOfficeId?: unknown;
  commune?: unknown;
  notes?: unknown;
  items?: unknown;
  subtotal?: unknown;
  shippingCost?: unknown;
};

export async function POST(request: Request) {
  try {
    if (!assertSameOrigin(request)) {
      return NextResponse.json({ error: "Origine non autorisée" }, { status: 403 });
    }

    const ip = getClientIp(request);
    const limit = rateLimit(`order:${hashIp(ip)}`, { limit: 8, windowMs: 15 * 60 * 1000 });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Trop de commandes. Réessayez plus tard." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const parsed = await readJsonBody<OrderBody>(request, 80_000);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }
    const body = parsed.data;

    const firstName = sanitizeText(body.firstName, 80);
    const lastName = sanitizeText(body.lastName, 80);
    const phone = sanitizeText(body.phone, 30);
    const instagramHandle = body.instagramHandle ? sanitizeText(body.instagramHandle, 80) : null;
    const wilayaCode = sanitizeText(body.wilayaCode, 4);
    const deliveryMethod = body.deliveryMethod as DeliveryMethod;
    const deliveryAddress = body.deliveryAddress ? sanitizeText(body.deliveryAddress, 500) : null;
    const deliveryOfficeId = body.deliveryOfficeId ? sanitizeText(body.deliveryOfficeId, 80) : null;
    const commune = sanitizeText(body.commune, 120);
    const notes = body.notes ? sanitizeText(body.notes, 1000) : null;
    const items = body.items;
    const subtotal = body.subtotal;
    const shippingCost = body.shippingCost;

    if (!firstName || !lastName || !phone || !wilayaCode || !deliveryMethod || !commune) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }

    if (commune.length < 2) {
      return NextResponse.json({ error: "Commune invalide" }, { status: 400 });
    }

    if (!isValidAlgerianPhone(phone)) {
      return NextResponse.json({ error: "Numéro de téléphone invalide" }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Panier vide" }, { status: 400 });
    }

    if (items.length > 50) {
      return NextResponse.json({ error: "Trop d'articles dans la commande" }, { status: 400 });
    }

    const method = deliveryMethod;
    if (method !== "HOME" && method !== "OFFICE") {
      return NextResponse.json({ error: "Mode de livraison invalide" }, { status: 400 });
    }

    const wilaya = await prisma.wilaya.findUnique({ where: { code: wilayaCode, active: true } });
    if (!wilaya) {
      return NextResponse.json({ error: "Wilaya invalide" }, { status: 400 });
    }

    let office: { id: string; nameFr: string; nameAr: string } | null = null;

    if (method === "HOME") {
      if (!deliveryAddress || deliveryAddress.length < 5) {
        return NextResponse.json({ error: "Adresse de livraison requise" }, { status: 400 });
      }
    } else {
      if (!deliveryOfficeId) {
        return NextResponse.json({ error: "Bureau de retrait requis" }, { status: 400 });
      }
      office = await prisma.deliveryOffice.findFirst({
        where: { id: deliveryOfficeId, wilayaId: wilaya.id, active: true },
      });
      if (!office) {
        return NextResponse.json({ error: "Bureau invalide" }, { status: 400 });
      }
    }

    const expectedShipping =
      method === "HOME" ? wilaya.homeShippingPrice : wilaya.officeShippingPrice;

    type CartLine = {
      quantity: number;
      slug: string;
      productId: string;
      sizeRaw: string;
      colorRaw: string;
    };

    const cartLines: CartLine[] = [];
    for (const item of items) {
      if (!item || typeof item !== "object") {
        return NextResponse.json({ error: "Article invalide" }, { status: 400 });
      }
      const row = item as Record<string, unknown>;
      cartLines.push({
        quantity: Math.min(Math.max(Number.parseInt(String(row.quantity ?? 1), 10) || 1, 1), 99),
        slug: typeof row.slug === "string" ? sanitizeText(row.slug, 120) : "",
        productId: typeof row.productId === "string" ? sanitizeText(row.productId, 80) : "",
        sizeRaw: typeof row.size === "string" ? sanitizeText(row.size, 40) : "",
        colorRaw: typeof row.color === "string" ? sanitizeText(row.color, 80) : "",
      });
    }

    const productIds = [...new Set(cartLines.map((l) => l.productId).filter(Boolean))];
    const productSlugs = [...new Set(cartLines.map((l) => l.slug).filter(Boolean))];

    if (productIds.length === 0 && productSlugs.length === 0) {
      return NextResponse.json({ error: "Articles invalides" }, { status: 400 });
    }

    const [dbProducts, settings] = await Promise.all([
      prisma.product.findMany({
        where: {
          OR: [
            ...(productIds.length > 0 ? [{ id: { in: productIds } }] : []),
            ...(productSlugs.length > 0 ? [{ slug: { in: productSlugs } }] : []),
          ],
        },
      }),
      prisma.siteSettings.findFirst({ select: { instagramUrl: true } }),
    ]);

    const byId = new Map(dbProducts.map((p) => [p.id, p]));
    const bySlug = new Map(dbProducts.map((p) => [p.slug, p]));

    let computedSubtotal = 0;
    const enrichedItems: Array<{
      productId: string;
      slug?: string;
      quantity: number;
      price: number;
      size?: string;
      color?: string;
      image: string;
      nameFr: string;
      nameAr: string;
      available: boolean;
    }> = [];

    for (const line of cartLines) {
      const product =
        (line.slug ? bySlug.get(line.slug) : undefined) ??
        (line.productId ? byId.get(line.productId) : undefined) ??
        null;

      if (!product || !product.active) {
        return NextResponse.json(
          {
            error:
              "Un article de votre panier n'est plus disponible. Videz le panier et rajoutez vos produits.",
            productSlug: line.slug || line.productId || "inconnu",
          },
          { status: 400 }
        );
      }

      const variants = getProductVariants(product);
      const size = line.sizeRaw || sizeLabels(variants)[0] || "Unique";
      const color = line.colorRaw || undefined;
      const available = getVariantStock(variants, size, color);
      if (available < line.quantity) {
        const detail = [size, color].filter(Boolean).join(" · ");
        return NextResponse.json(
          {
            error: `Stock insuffisant pour ${product.nameFr}${detail ? ` (${detail})` : ""}`,
          },
          { status: 400 }
        );
      }

      const sizePrice = getSizeBasePrice(variants, size, product.price);
      const unitPrice = getEffectiveSizePrice(product, sizePrice);
      const selectedImage =
        findColorVariant(variants, color)?.image ||
        getProductImages(product.images, product.colors)[0] ||
        "/placeholder.svg";
      computedSubtotal += unitPrice * line.quantity;
      enrichedItems.push({
        productId: product.id,
        slug: product.slug,
        quantity: line.quantity,
        price: unitPrice,
        size,
        color,
        image: selectedImage,
        nameFr: product.nameFr,
        nameAr: product.nameAr,
        available: true,
      });
    }

    const computedTotal = computedSubtotal + expectedShipping;

    if (
      Math.abs(computedSubtotal - Number(subtotal)) > 1 ||
      Math.abs(expectedShipping - Number(shippingCost)) > 1
    ) {
      return NextResponse.json(
        {
          error: "Montants invalides",
          subtotal: computedSubtotal,
          shippingCost: expectedShipping,
          total: computedTotal,
        },
        { status: 400 }
      );
    }

    const customerName = `${firstName} ${lastName}`;
    const address = buildOrderAddress({
      lang: "fr",
      method,
      wilaya,
      deliveryAddress: deliveryAddress ?? undefined,
      office: office ?? undefined,
    });

    const orderNumber = generateOrderNumber();

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerName,
        firstName,
        lastName,
        phone,
        instagramHandle: instagramHandle ? normalizeInstagramHandle(instagramHandle) : null,
        address,
        wilayaCode,
        wilayaName: wilaya.nameFr,
        deliveryMethod: method,
        deliveryAddress: method === "HOME" ? deliveryAddress : null,
        deliveryOfficeId: office?.id ?? null,
        deliveryOfficeName: office?.nameFr ?? null,
        commune,
        items: JSON.stringify(enrichedItems),
        subtotal: computedSubtotal,
        shippingCost: expectedShipping,
        total: computedTotal,
        notes,
        status: "PENDING",
        stockManaged: true,
        stockDeducted: false,
      },
    });

    notifyOwnerNewOrder({
      orderNumber: order.orderNumber,
      customerName,
      phone,
      wilayaName: wilaya.nameFr,
      wilayaCode,
      deliveryMethod: method,
      deliveryAddress: order.deliveryAddress,
      deliveryOfficeName: order.deliveryOfficeName,
      items: enrichedItems,
      subtotal: computedSubtotal,
      shippingCost: expectedShipping,
      total: computedTotal,
      notes: order.notes,
      createdAt: order.createdAt,
    }).then((result) => {
      if (!result.ok) {
        console.error("[whatsapp] notification failed:", result.error);
      }
    }).catch((err) => {
      console.error("[whatsapp]", err);
    });

    return NextResponse.json({
      orderNumber: order.orderNumber,
      instagramUrl: getInstagramUrl(settings?.instagramUrl),
      total: computedTotal,
      subtotal: computedSubtotal,
      shippingCost: expectedShipping,
      address: order.address,
    });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const orders = await prisma.order.findMany({ orderBy: { createdAt: "desc" } });
  const parsedItems = orders.map((order) => {
    try {
      const items = JSON.parse(order.items);
      return Array.isArray(items) ? items : [];
    } catch {
      return [];
    }
  });
  const productIds = [
    ...new Set(
      parsedItems
        .flatMap((items) => items)
        .map((item) => (item && typeof item.productId === "string" ? item.productId : ""))
        .filter(Boolean)
    ),
  ];
  const products = productIds.length
    ? await prisma.product.findMany({ where: { id: { in: productIds } } })
    : [];
  const productById = new Map(products.map((product) => [product.id, product]));

  const enrichedOrders = orders.map((order, orderIndex) => ({
    ...order,
    items: JSON.stringify(
      parsedItems[orderIndex].map((item) => {
        if (item?.image || typeof item?.productId !== "string") return item;
        const product = productById.get(item.productId);
        if (!product) return item;
        const variants = getProductVariants(product);
        return {
          ...item,
          image:
            findColorVariant(variants, item.color)?.image ||
            getProductImages(product.images, product.colors)[0] ||
            "/placeholder.svg",
        };
      })
    ),
  }));

  return NextResponse.json(enrichedOrders);
}
