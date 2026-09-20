import { sanitizeInstagramUrl } from "@/lib/social";

export function normalizeInstagramHandle(value: string): string {
  return value
    .trim()
    .replace(/^@/, "")
    .replace(/https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/\/$/, "")
    .split("/")[0];
}

export function isValidInstagramHandle(value: string): boolean {
  if (!value.trim()) return true;
  const handle = normalizeInstagramHandle(value);
  return /^[a-zA-Z0-9._]{1,30}$/.test(handle);
}

export function buildInstagramOrderMessage(params: {
  orderNumber: string;
  customerName: string;
  phone: string;
  instagramHandle?: string;
  address: string;
  items: { name: string; quantity: number; price: number; size?: string; color?: string }[];
  subtotal: number;
  shippingCost: number;
  total: number;
}): string {
  const lines = [
    `🛍️ Nouvelle commande Zella Luxe #${params.orderNumber}`,
    ``,
    `👤 ${params.customerName}`,
    `📱 ${params.phone}`,
    ...(params.instagramHandle ? [`📸 @${params.instagramHandle}`] : []),
    `📍 ${params.address}`,
    ``,
    `📦 Articles:`,
    ...params.items.map(
      (item) =>
        `• ${item.name}${item.size ? ` (${item.size})` : ""}${item.color ? ` — ${item.color}` : ""} x${item.quantity} — ${item.price * item.quantity} DA`
    ),
    ``,
    `🛒 Sous-total: ${params.subtotal} DA`,
    `🚚 Livraison: ${params.shippingCost} DA`,
    `💰 Total: ${params.total} DA`,
  ];
  return lines.join("\n");
}

export function getInstagramUrl(instagramUrl?: string): string {
  const raw = sanitizeInstagramUrl(instagramUrl);
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw.endsWith("/") ? raw : `${raw}/`;
  const handle = normalizeInstagramHandle(raw);
  return handle ? `https://www.instagram.com/${handle}/` : "";
}

export function getInstagramHandle(instagramUrl?: string): string {
  const url = getInstagramUrl(instagramUrl);
  if (!url) return "";
  return normalizeInstagramHandle(url);
}
