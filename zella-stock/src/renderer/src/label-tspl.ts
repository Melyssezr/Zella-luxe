import type { CatalogProduct } from "./catalog";
import { encodeVariantCode, labelFields, variantKind } from "./variant-code";

export type LabelPrintItem = {
  product: CatalogProduct;
  color: string;
  size: string;
  copies?: number;
  /** Si fourni (ex: 2000000000862V000), utilise ce code au lieu de ZL/... */
  barcode?: string;
};

/** Etiquette paysage XP-410 : largeur 40 mm, hauteur 20 mm. */
const LABEL_W_MM = 40;
const LABEL_H_MM = 20;

function toPrinterText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—−]/g, "-")
    .replace(/[×✕✖]/g, "x")
    .replace(/[·•]/g, "-")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/€/g, "EUR")
    .replace(/[^\x20-\x7E]/g, "?");
}

function esc(text: string) {
  return toPrinterText(text).replace(/\\/g, "\\\\").replace(/"/g, "'");
}

/** Coupe en 1-2 lignes sans tronquer brutalement au milieu si possible. */
function wrapName(name: string, maxPerLine = 26): string[] {
  const clean = toPrinterText(name.trim());
  if (clean.length <= maxPerLine) return [clean];
  const words = clean.split(/\s+/);
  const lines: string[] = ["", ""];
  let li = 0;
  for (const word of words) {
    const next = lines[li] ? `${lines[li]} ${word}` : word;
    if (next.length <= maxPerLine) {
      lines[li] = next;
    } else if (li === 0) {
      li = 1;
      lines[1] = word.slice(0, maxPerLine);
    } else {
      lines[1] = `${lines[1]} ${word}`.trim().slice(0, maxPerLine);
    }
  }
  return lines.filter(Boolean);
}

function bottomLine(product: CatalogProduct, color: string, size: string): string {
  const kind = variantKind(product.category);
  const fields = labelFields(product, color, size);
  const parts: string[] = [];
  if (fields.showColor) parts.push(toPrinterText(color));
  if (fields.showSize) {
    const label = kind === "shoe" ? "Pt" : "T";
    parts.push(`${label} ${toPrinterText(size)}`);
  }
  if (parts.length === 0) {
    if (color && color !== "Unique") parts.push(toPrinterText(color));
    if (size && size !== "Unique") parts.push(toPrinterText(size));
  }
  return parts.join(" | ").slice(0, 32);
}

/**
 * Layout demande:
 * - PAS de "ZELLA LUXE"
 * - Haut: nom produit (petit, 1-2 lignes, texte complet)
 * - Milieu: code-barres
 * - Bas: couleur + pointure/taille
 * Format: 40 mm x 20 mm
 */
export function buildVariantLabelTspl(item: LabelPrintItem): string {
  const { product, color, size } = item;
  const copies = Math.max(1, item.copies ?? 1);
  const code = (item.barcode && item.barcode.trim()) || encodeVariantCode(product.ref, color, size);
  const nameLines = wrapName(product.name, 26);
  const bottom = bottomLine(product, color, size);

  const lines = [
    `SIZE ${LABEL_W_MM} mm, ${LABEL_H_MM} mm`,
    "GAP 2 mm, 0 mm",
    "DIRECTION 1",
    "REFERENCE 0,0",
    "OFFSET 0 mm",
    "CLS",
  ];

  // Haut: nom (police 1 = petite)
  let y = 6;
  for (const row of nameLines.slice(0, 2)) {
    lines.push(`TEXT 10,${y},"1",0,1,1,"${esc(row)}"`);
    y += 14;
  }

  // Milieu: code-barres centre (pas de HRI TSPL pour eviter police bizarre; on remet le code en bas)
  lines.push(`BARCODE 28,40,"128",48,0,0,1,2,"${esc(code)}"`);

  // Bas: couleur / pointure-taille
  if (bottom) {
    lines.push(`TEXT 10,118,"1",0,1,1,"${esc(bottom)}"`);
  }

  lines.push(`PRINT ${copies},1`);
  lines.push("");
  return lines.join("\r\n");
}

export function buildMultiLabelTspl(items: LabelPrintItem[]): string {
  return items.map((item) => buildVariantLabelTspl(item)).join("");
}
