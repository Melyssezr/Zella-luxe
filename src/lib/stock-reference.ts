import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

export async function stockReference(
  raw: string,
  nameFr: string,
  generate: boolean,
  exceptId?: string,
) {
  const given = raw.trim().toUpperCase();
  if (given) return given;
  if (!generate) return null;
  const base = (slugify(nameFr) || "produit").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) || "PRODUIT";
  let candidate = base;
  let n = 1;
  while (true) {
    const found = await prisma.product.findFirst({ where: { reference: candidate } });
    if (!found || found.id === exceptId) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}
