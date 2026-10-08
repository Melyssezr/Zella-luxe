import type { CatalogProduct } from "./catalog";
import { encodeVariantCode, labelFields } from "./variant-code";

export type LabelPrintItem = {
  product: CatalogProduct;
  color: string;
  size: string;
  copies?: number;
};

function esc(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/"/g, "'").slice(0, 36);
}

function shortName(name: string, max = 18) {
  const clean = name.trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}.`;
}

/**
 * Etiquette 40x30 mm — texte petit a gauche, code-barres a droite.
 * Plus de chevauchement: interlignes fixes, police 1 (petite).
 * DIRECTION 1 = sens lecture apres dechirement XP-410.
 */
export function buildVariantLabelTspl(item: LabelPrintItem): string {
  const { product, color, size } = item;
  const copies = Math.max(1, item.copies ?? 1);
  const fields = labelFields(product, color, size);
  const code = encodeVariantCode(product.ref, color, size);
  const price = product.onPromo && product.promoPrice > 0 ? product.promoPrice : product.price;
  const priceText = `${Math.round(price)} DA`;

  const info: string[] = [
    "ZELLA",
    product.ref,
    shortName(product.name),
    ...fields.lines,
    priceText,
  ];

  const lines = [
    "SIZE 40 mm, 30 mm",
    "GAP 2 mm, 0 mm",
    "DIRECTION 1",
    "REFERENCE 0,0",
    "OFFSET 0 mm",
    "CLS",
  ];

  let y = 12;
  for (const row of info) {
    lines.push(`TEXT 12,${y},"1",0,1,1,"${esc(row)}"`);
    y += 20;
  }

  // Code-barres verticalement a droite (ne mange pas les lignes texte)
  lines.push(`BARCODE 210,24,"128",70,1,0,1,1,"${esc(code)}"`);
  lines.push(`TEXT 210,110,"1",0,1,1,"${esc(code.slice(0, 18))}"`);
  lines.push(`PRINT ${copies},1`);
  lines.push("");
  return lines.join("\r\n");
}

export function buildMultiLabelTspl(items: LabelPrintItem[]): string {
  return items.map((item) => buildVariantLabelTspl(item)).join("");
}
