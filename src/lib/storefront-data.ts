import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { DESIGN_ONLY_IMAGES } from "@/lib/images";

const PUBLIC_DATA_REVALIDATE_SECONDS = 3600;

export const getCachedHomeData = unstable_cache(
  async () => {
    const [featured, promos, gallery, reviews] = await Promise.all([
      prisma.product.findMany({
        where: { active: true },
        take: 8,
        orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
        include: {
          reviews: { where: { status: "APPROVED" }, select: { rating: true } },
        },
      }),
      prisma.product.findMany({
        where: { active: true, onPromo: true },
        take: 4,
        orderBy: { updatedAt: "desc" },
        include: {
          reviews: { where: { status: "APPROVED" }, select: { rating: true } },
        },
      }),
      prisma.galleryImage.findMany({
        where: { active: true, url: { notIn: [...DESIGN_ONLY_IMAGES] } },
        take: 8,
        orderBy: { sortOrder: "asc" },
      }),
      prisma.review.findMany({
        where: { status: "APPROVED" },
        include: { product: { select: { nameFr: true, nameAr: true } } },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
    ]);

    return { featured, promos, gallery, reviews };
  },
  ["zella-home-data-v1"],
  {
    tags: [CACHE_TAGS.products, CACHE_TAGS.gallery, CACHE_TAGS.reviews],
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
  }
);

export const getCachedCatalogueProducts = unstable_cache(
  async () =>
    prisma.product.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      include: {
        reviews: { where: { status: "APPROVED" }, select: { rating: true } },
      },
    }),
  ["zella-catalogue-products-v1"],
  {
    tags: [CACHE_TAGS.products, CACHE_TAGS.reviews],
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
  }
);

export const getCachedPromotionProducts = unstable_cache(
  async () =>
    prisma.product.findMany({
      where: { active: true, onPromo: true },
      orderBy: { updatedAt: "desc" },
      include: {
        reviews: { where: { status: "APPROVED" }, select: { rating: true } },
      },
    }),
  ["zella-promotion-products-v1"],
  {
    tags: [CACHE_TAGS.products, CACHE_TAGS.reviews],
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
  }
);

export const getCachedReviewFormProducts = unstable_cache(
  async () =>
    prisma.product.findMany({
      where: { active: true },
      select: { id: true, nameFr: true, nameAr: true, slug: true },
      orderBy: { nameFr: "asc" },
    }),
  ["zella-review-form-products-v1"],
  {
    tags: [CACHE_TAGS.products],
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
  }
);

export const getCachedGalleryImages = unstable_cache(
  async () =>
    prisma.galleryImage.findMany({
      where: { active: true, url: { notIn: [...DESIGN_ONLY_IMAGES] } },
      orderBy: { sortOrder: "asc" },
    }),
  ["zella-gallery-images-v1"],
  {
    tags: [CACHE_TAGS.gallery],
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
  }
);

export const getCachedActiveProductSlugs = unstable_cache(
  async () =>
    prisma.product.findMany({
      where: { active: true },
      select: { slug: true },
      orderBy: { createdAt: "desc" },
    }),
  ["zella-active-product-slugs-v1"],
  {
    tags: [CACHE_TAGS.products],
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
  }
);

export const getCachedProductPageData = unstable_cache(
  async (slug: string) => {
    const product = await prisma.product.findUnique({
      where: { slug, active: true },
      include: {
        reviews: { where: { status: "APPROVED" }, select: { rating: true } },
      },
    });
    if (!product) return null;

    const related = await prisma.product.findMany({
      where: { category: product.category, active: true, id: { not: product.id } },
      take: 4,
      include: {
        reviews: { where: { status: "APPROVED" }, select: { rating: true } },
      },
    });

    return { product, related };
  },
  ["zella-product-page-v1"],
  {
    tags: [CACHE_TAGS.products, CACHE_TAGS.reviews],
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
  }
);
