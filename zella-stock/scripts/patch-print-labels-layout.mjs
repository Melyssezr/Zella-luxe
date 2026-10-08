/**
 * Force le layout etiquette 40x20 dans print-labels.ts
 * Usage: node scripts/patch-print-labels-layout.mjs
 */
import fs from "fs";
import path from "path";

const root = process.cwd();
const file = path.join(root, "src/renderer/src/print-labels.ts");
if (!fs.existsSync(file)) {
  console.log("print-labels.ts introuvable");
  process.exit(0);
}

let src = fs.readFileSync(file, "utf8");
const orig = src;

if (!src.includes('from "./label-tspl"') && !src.includes("from './label-tspl'")) {
  src = `import { buildVariantLabelTspl } from "./label-tspl";\n` + src;
}

// Detect likely name/color/size/barcode identifiers from existing template
const nameExpr =
  (src.match(/TEXT[^"]*"\$\{([^}]+)\}"[^\n]*\n[^\n]*TEXT/) || [])[1] ||
  (src.match(/\$\{([^}]*name[^}]*)\}/i) || [])[1] ||
  "product.name";
const colorExpr = (src.match(/\$\{([^}]*color[^}]*)\}/i) || [])[1] || "color";
const sizeExpr = (src.match(/\$\{([^}]*size[^}]*)\}/i) || [])[1] || "size";
const barcodeExpr =
  (src.match(/BARCODE[^"]*"\$\{([^}]+)\}"/) || [])[1] ||
  (src.match(/\$\{([^}]*barcode[^}]*)\}/i) || [])[1] ||
  (src.match(/\$\{([^}]*code[^}]*)\}/i) || [])[1] ||
  "barcode";
const copiesExpr = (src.match(/PRINT\s+\$\{([^}]+)\}/) || [])[1] || "1";
const categoryExpr = (src.match(/\$\{([^}]*categor[^}]*)\}/i) || [])[1] || '""';
const refExpr = (src.match(/\$\{([^}]*\bref\b[^}]*)\}/i) || [])[1] || '""';

const call = `buildVariantLabelTspl({
    product: { ref: String(${refExpr} || "X"), name: String(${nameExpr} || ""), category: String(${categoryExpr} || ""), price: 0, promoPrice: 0, onPromo: false } as any,
    color: String(${colorExpr} || "Unique"),
    size: String(${sizeExpr} || "Unique"),
    copies: Number(${copiesExpr}) || 1,
    barcode: String(${barcodeExpr} || ""),
  })`;

// Replace backtick blocks that look like TSPL jobs
src = src.replace(/`[\s\S]*?SIZE\s+\d+\s*mm[\s\S]*?PRINT[\s\S]*?`/g, () => call);

// Also replace string concat blocks starting with SIZE
src = src.replace(/(["'])SIZE\s+\d+\s*mm[\s\S]*?PRINT[\s\S]*?\1/g, () => call);

if (src === orig && !src.includes("buildVariantLabelTspl(")) {
  // Append safe helper; manual wiring may still be needed
  src += `

/** Auto-added 40x20 layout helper */
export function buildZellaLabel40x20(opts: {
  name: string; color: string; size: string; barcode: string; category?: string; copies?: number; ref?: string;
}) {
  return buildVariantLabelTspl({
    product: { ref: opts.ref || "X", name: opts.name, category: opts.category || "", price: 0, promoPrice: 0, onPromo: false } as any,
    color: opts.color || "Unique",
    size: opts.size || "Unique",
    copies: opts.copies || 1,
    barcode: opts.barcode,
  });
}
`;
  console.log("Aucun bloc TSPL remplace - helper buildZellaLabel40x20 ajoute");
} else {
  console.log("Blocs TSPL rediriges vers buildVariantLabelTspl (40x20)");
}

fs.writeFileSync(file, src, "utf8");
console.log("OK", file);
