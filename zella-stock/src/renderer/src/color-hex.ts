const NAMED_HEX: Record<string, string> = {
  noir: "#1a1a1a",
  noire: "#1a1a1a",
  black: "#1a1a1a",
  blanc: "#f7f4ee",
  blanche: "#f7f4ee",
  white: "#f7f4ee",
  ivoire: "#f4edd8",
  ivory: "#f4edd8",
  champagne: "#ead9b5",
  beige: "#dcc7a6",
  nude: "#e6cbb3",
  or: "#c9a86c",
  gold: "#c9a86c",
  dore: "#c9a86c",
  "doree": "#c9a86c",
  argent: "#c5c5c5",
  silver: "#c5c5c5",
  gris: "#8a8a8a",
  gray: "#8a8a8a",
  grey: "#8a8a8a",
  bordeaux: "#65232b",
  burgundy: "#65232b",
  wine: "#65232b",
  rouge: "#9b1c1c",
  red: "#9b1c1c",
  rose: "#e8a0b0",
  pink: "#e8a0b0",
  marron: "#6b4423",
  brown: "#6b4423",
  chocolat: "#4a2c2a",
  chocolate: "#4a2c2a",
  bleu: "#1e3a5f",
  blue: "#1e3a5f",
  marine: "#1e3a5f",
  navy: "#1e3a5f",
  vert: "#3d5c3a",
  green: "#3d5c3a",
  camel: "#c19a6b",
  taupe: "#8b7d6b",
  kaki: "#6b6b3d",
  khaki: "#6b6b3d",
};

export function colorKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function hexFromColorName(name?: string) {
  if (!name?.trim()) return "";
  return NAMED_HEX[colorKey(name)] || "";
}

export function isValidHex(value?: string) {
  return Boolean(value && /^#[0-9a-fA-F]{6}$/.test(value.trim()));
}

export function resolveColorHex(hex?: string, name?: string) {
  if (isValidHex(hex)) return hex!.trim();
  return hexFromColorName(name) || "";
}
