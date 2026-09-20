export type SocialSettings = {
  instagramUrl?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
  whatsapp?: string;
};

export const DEFAULT_SOCIAL = {
  instagram: "https://www.instagram.com/zella.luxe?igsh=MWMwMnZyaDJobGhtZg==",
  facebook: "https://www.facebook.com/Zella.luxe",
  tiktok: "https://vt.tiktok.com/ZSCcNpM2j/",
  whatsapp: "213666816878",
};

const PLACEHOLDER_INSTAGRAM = /melysse\._\.zr/i;

export function sanitizeInstagramUrl(url?: string | null): string {
  const trimmed = url?.trim() ?? "";
  if (!trimmed || PLACEHOLDER_INSTAGRAM.test(trimmed)) return "";
  return trimmed;
}

export function getWhatsAppUrl(phone: string, message?: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${text}`;
}

export function resolveSocialLinks(settings?: SocialSettings | null) {
  const whatsappPhone = settings?.whatsapp?.trim() || DEFAULT_SOCIAL.whatsapp;
  const instagram = sanitizeInstagramUrl(settings?.instagramUrl) || DEFAULT_SOCIAL.instagram;

  return {
    instagram,
    facebook: settings?.facebookUrl?.trim() || DEFAULT_SOCIAL.facebook,
    tiktok: settings?.tiktokUrl?.trim() || DEFAULT_SOCIAL.tiktok,
    whatsapp: getWhatsAppUrl(whatsappPhone),
    whatsappPhone,
  };
}
