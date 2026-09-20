type OrderItem = {
  nameFr?: string;
  nameAr?: string;
  slug?: string;
  quantity?: number;
  price?: number;
  size?: string;
  color?: string;
};

export type OrderWhatsAppPayload = {
  orderNumber: string;
  customerName: string;
  phone: string;
  wilayaName: string;
  wilayaCode: string;
  deliveryMethod: "HOME" | "OFFICE";
  deliveryAddress?: string | null;
  deliveryOfficeName?: string | null;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  notes?: string | null;
  createdAt: Date;
};

export type WhatsAppSendResult = { ok: true; provider: string } | { ok: false; error: string; provider?: string };

const WHATSAPP_MAX_CHARS = 3500;

function formatMoney(amount: number): string {
  return `${Math.round(amount).toLocaleString("fr-DZ")} DA`;
}

function formatOrderDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-DZ", {
    timeZone: "Africa/Algiers",
    dateStyle: "full",
    timeStyle: "short",
  }).format(date);
}

function deliveryLabel(order: OrderWhatsAppPayload): string {
  return order.deliveryMethod === "HOME"
    ? `À domicile — ${order.deliveryAddress?.trim() || "adresse non précisée"}`
    : `Retrait bureau — ${order.deliveryOfficeName?.trim() || "bureau non précisé"}`;
}

function productsSummary(items: OrderItem[], maxLen = 900): string {
  const lines = items.map((item) => {
    const name = item.nameFr || item.nameAr || item.slug || "Article";
    const qty = item.quantity ?? 1;
    const unit = item.price ?? 0;
    const extras = [item.size, item.color].filter(Boolean).join(" · ");
    return `• ${name}${extras ? ` (${extras})` : ""} × ${qty} — ${formatMoney(unit * qty)}`;
  });
  let text = lines.join("\n");
  if (text.length > maxLen) {
    text = `${text.slice(0, maxLen - 1)}…`;
  }
  return text || "—";
}

export function buildOrderWhatsAppMessage(order: OrderWhatsAppPayload): string {
  const lines = [
    "🛍️ *Nouvelle commande Zella Luxe*",
    `📋 N° ${order.orderNumber}`,
    "",
    `👤 *Client:* ${order.customerName}`,
    `📱 *Téléphone:* ${order.phone}`,
    `📍 *Wilaya:* ${order.wilayaCode} — ${order.wilayaName}`,
    `🚚 *Livraison:* ${deliveryLabel(order)}`,
    "",
    "📦 *Produits:*",
    productsSummary(order.items),
    "",
    `💰 Sous-total: ${formatMoney(order.subtotal)}`,
    `🚚 Livraison: ${formatMoney(order.shippingCost)}`,
    `✅ *Total: ${formatMoney(order.total)}*`,
    "",
    `📅 *Date:* ${formatOrderDate(order.createdAt)}`,
  ];

  if (order.notes?.trim()) {
    lines.push(`📝 *Notes:* ${order.notes.trim().slice(0, 300)}`);
  }

  return lines.join("\n").slice(0, WHATSAPP_MAX_CHARS);
}

function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

function normalizeWhatsAppTo(phone: string): string {
  const digits = digitsOnly(phone);
  if (digits.startsWith("213")) return `whatsapp:+${digits}`;
  if (digits.startsWith("0")) return `whatsapp:+213${digits.slice(1)}`;
  return `whatsapp:+${digits}`;
}

function ownerDigits(): string | null {
  const ownerTo = process.env.WHATSAPP_OWNER_TO?.trim();
  if (!ownerTo) return null;
  const digits = digitsOnly(ownerTo);
  return digits || null;
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function withRetry(
  fn: () => Promise<WhatsAppSendResult>,
  attempts = 2
): Promise<WhatsAppSendResult> {
  let last: WhatsAppSendResult = { ok: false, error: "unknown" };
  for (let i = 0; i < attempts; i++) {
    last = await fn();
    if (last.ok) return last;
    if (i < attempts - 1) await sleep(400 * (i + 1));
  }
  return last;
}

/**
 * Meta Cloud API template (recommended for business-initiated notifications).
 * Create a UTILITY template in Meta Business Manager with 8 body variables:
 * {{1}} order number, {{2}} customer, {{3}} phone, {{4}} wilaya,
 * {{5}} delivery, {{6}} products, {{7}} total, {{8}} date/time
 */
function buildMetaTemplatePayload(order: OrderWhatsAppPayload, to: string) {
  const name = process.env.WHATSAPP_TEMPLATE_NAME?.trim();
  const lang = process.env.WHATSAPP_TEMPLATE_LANG?.trim() || "fr";
  if (!name) return null;

  const params = [
    order.orderNumber,
    order.customerName.slice(0, 60),
    order.phone.slice(0, 24),
    `${order.wilayaCode} ${order.wilayaName}`.slice(0, 60),
    deliveryLabel(order).slice(0, 120),
    productsSummary(order.items, 600).replace(/\n/g, " | ").slice(0, 600),
    formatMoney(order.total),
    formatOrderDate(order.createdAt).slice(0, 80),
  ].map((text) => ({ type: "text" as const, text: text || "—" }));

  return {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name,
      language: { code: lang },
      components: [{ type: "body", parameters: params }],
    },
  };
}

async function sendViaMetaCloud(
  order: OrderWhatsAppPayload,
  message: string,
  ownerTo: string
): Promise<WhatsAppSendResult> {
  const token = process.env.WHATSAPP_CLOUD_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!token || !phoneNumberId) {
    return {
      ok: false,
      provider: "meta",
      error: "Meta Cloud API not configured (WHATSAPP_CLOUD_TOKEN, WHATSAPP_PHONE_NUMBER_ID)",
    };
  }

  const to = digitsOnly(ownerTo);
  const templatePayload = buildMetaTemplatePayload(order, to);
  const allowSessionText = process.env.WHATSAPP_ALLOW_SESSION_TEXT === "1";

  const payloads: unknown[] = [];
  if (templatePayload) payloads.push(templatePayload);
  if (!templatePayload || allowSessionText) {
    payloads.push({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: message, preview_url: false },
    });
  }

  let lastError = "Meta API: no payload sent";
  for (const body of payloads) {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      return { ok: true, provider: "meta" };
    }

    const errBody = await res.text();
    lastError = `Meta API error ${res.status}: ${errBody.slice(0, 240)}`;
    // If template fails, try next payload (session text) when configured.
  }

  return { ok: false, provider: "meta", error: lastError };
}

async function sendViaTwilio(order: OrderWhatsAppPayload, message: string, ownerTo: string): Promise<WhatsAppSendResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_WHATSAPP_FROM?.trim();
  if (!accountSid || !authToken || !from) {
    return {
      ok: false,
      provider: "twilio",
      error: "Twilio not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM)",
    };
  }

  const contentSid = process.env.TWILIO_WHATSAPP_CONTENT_SID?.trim();
  const body = new URLSearchParams({
    From: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
    To: normalizeWhatsAppTo(ownerTo),
  });

  if (contentSid) {
    // Content template (required outside 24h window). Variables {{1}}…{{8}}.
    body.set("ContentSid", contentSid);
    body.set(
      "ContentVariables",
      JSON.stringify({
        "1": order.orderNumber,
        "2": order.customerName.slice(0, 60),
        "3": order.phone.slice(0, 24),
        "4": `${order.wilayaCode} ${order.wilayaName}`.slice(0, 60),
        "5": deliveryLabel(order).slice(0, 120),
        "6": productsSummary(order.items, 400).replace(/\n/g, " | ").slice(0, 400),
        "7": formatMoney(order.total),
        "8": formatOrderDate(order.createdAt).slice(0, 80),
      })
    );
  } else {
    body.set("Body", message);
  }

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, provider: "twilio", error: `Twilio error ${res.status}: ${text.slice(0, 240)}` };
  }

  return { ok: true, provider: "twilio" };
}

export function isWhatsAppConfigured(): boolean {
  if (!ownerDigits()) return false;
  const provider = (process.env.WHATSAPP_PROVIDER || "meta").toLowerCase();
  if (provider === "twilio") {
    return Boolean(
      process.env.TWILIO_ACCOUNT_SID?.trim() &&
        process.env.TWILIO_AUTH_TOKEN?.trim() &&
        process.env.TWILIO_WHATSAPP_FROM?.trim()
    );
  }
  return Boolean(process.env.WHATSAPP_CLOUD_TOKEN?.trim() && process.env.WHATSAPP_PHONE_NUMBER_ID?.trim());
}

/** Send owner notification for a new order (template preferred, retry once). */
export async function notifyOwnerNewOrder(order: OrderWhatsAppPayload): Promise<WhatsAppSendResult> {
  const ownerTo = process.env.WHATSAPP_OWNER_TO?.trim();
  if (!ownerTo) {
    return { ok: false, error: "WHATSAPP_OWNER_TO not configured" };
  }

  const message = buildOrderWhatsAppMessage(order);
  const provider = (process.env.WHATSAPP_PROVIDER || "meta").toLowerCase();

  return withRetry(() =>
    provider === "twilio" ? sendViaTwilio(order, message, ownerTo) : sendViaMetaCloud(order, message, ownerTo)
  );
}

/** @deprecated use notifyOwnerNewOrder */
export async function sendOwnerWhatsAppNotification(message: string): Promise<WhatsAppSendResult> {
  const ownerTo = process.env.WHATSAPP_OWNER_TO?.trim();
  if (!ownerTo) return { ok: false, error: "WHATSAPP_OWNER_TO not configured" };
  const provider = (process.env.WHATSAPP_PROVIDER || "meta").toLowerCase();

  // Minimal wrapper for legacy callers — prefer notifyOwnerNewOrder.
  const stubOrder: OrderWhatsAppPayload = {
    orderNumber: "—",
    customerName: "—",
    phone: "—",
    wilayaName: "—",
    wilayaCode: "—",
    deliveryMethod: "HOME",
    items: [],
    subtotal: 0,
    shippingCost: 0,
    total: 0,
    createdAt: new Date(),
  };

  if (provider === "twilio" && !process.env.TWILIO_WHATSAPP_CONTENT_SID?.trim()) {
    return withRetry(() => sendViaTwilio(stubOrder, message, ownerTo));
  }
  if (provider !== "twilio" && !process.env.WHATSAPP_TEMPLATE_NAME?.trim()) {
    return withRetry(() => sendViaMetaCloud(stubOrder, message, ownerTo));
  }

  return {
    ok: false,
    error: "Use notifyOwnerNewOrder for templated WhatsApp Business notifications",
  };
}
