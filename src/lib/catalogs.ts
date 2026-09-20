import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CACHE_TAGS } from "@/lib/cache-tags";

export type PublicCatalog = {
  id: string;
  slug: string;
  nameFr: string;
  nameAr: string;
  coverImage: string;
  accentColor: string;
  sortOrder: number;
  active: boolean;
};

export const getActiveCatalogs = unstable_cache(
  async (): Promise<PublicCatalog[]> =>
    prisma.catalog.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { nameFr: "asc" }],
    }),
  ["zella-active-catalogs-v1"],
  { tags: [CACHE_TAGS.catalogs], revalidate: 3600 }
);

export async function getAllCatalogs(): Promise<PublicCatalog[]> {
  return prisma.catalog.findMany({
    orderBy: [{ sortOrder: "asc" }, { nameFr: "asc" }],
  });
}

/** Original product photos used for category tiles (before SVG illustrations). */
export const DEFAULT_CATALOGS: Omit<PublicCatalog, "id">[] = [
  {
    slug: "TALONS",
    nameFr: "Talons",
    nameAr: "كعب عالي",
    coverImage: "/images/escarpin-strass-trio.jpg",
    accentColor: "#ff006e",
    sortOrder: 0,
    active: true,
  },
  {
    slug: "CHAUSSURES",
    nameFr: "Chaussures",
    nameAr: "أحذية",
    coverImage: "/images/botte-guêtre-bordeaux.jpg",
    accentColor: "#00f5ff",
    sortOrder: 1,
    active: true,
  },
  {
    slug: "SACS",
    nameFr: "Sacs",
    nameAr: "حقائب",
    coverImage: "/images/set-strass-multicolore.jpg",
    accentColor: "#bf00ff",
    sortOrder: 2,
    active: true,
  },
  {
    slug: "POCHETTES",
    nameFr: "Pochettes",
    nameAr: "محافظ",
    coverImage: "/images/pochette-or-strass.jpg",
    accentColor: "#ccff00",
    sortOrder: 3,
    active: true,
  },
  {
    slug: "VALISES",
    nameFr: "Valises",
    nameAr: "حقائب سفر",
    coverImage: "/images/valise-lv-monogram-rouge.jpg",
    accentColor: "#ffd700",
    sortOrder: 4,
    active: true,
  },
  {
    slug: "LUNETTES",
    nameFr: "Lunettes",
    nameAr: "نظارات",
    coverImage:
      "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&h=800&fit=crop&q=80",
    accentColor: "#8a7355",
    sortOrder: 5,
    active: true,
  },
];

export async function ensureDefaultCatalogs(): Promise<void> {
  for (const catalog of DEFAULT_CATALOGS) {
    await prisma.catalog.upsert({
      where: { slug: catalog.slug },
      // Do not overwrite accentColor — admins may customize it.
      update: {
        coverImage: catalog.coverImage,
        nameFr: catalog.nameFr,
        nameAr: catalog.nameAr,
        sortOrder: catalog.sortOrder,
        active: catalog.active,
      },
      create: catalog,
    });
  }
}
