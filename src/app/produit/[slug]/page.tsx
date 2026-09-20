import { notFound } from "next/navigation";
import { getRatingSummary, toStorefrontProduct } from "@/lib/utils";
import {
  getCachedActiveProductSlugs,
  getCachedProductPageData,
} from "@/lib/storefront-data";
import { ProductDetailClient } from "./ProductDetailClient";

export async function generateStaticParams() {
  const products = await getCachedActiveProductSlugs();
  return products.map(({ slug }) => ({ slug }));
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getCachedProductPageData(slug);
  if (!data) notFound();
  const { product, related } = data;

  const { reviews, ...productData } = product;
  const summary = getRatingSummary(reviews);

  const relatedMapped = related.map(({ reviews: r, ...p }) => {
    const s = getRatingSummary(r);
    return { ...toStorefrontProduct(p), avgRating: s.avg, reviewCount: s.count };
  });

  return (
    <ProductDetailClient
      product={{
        ...toStorefrontProduct(productData),
        avgRating: summary.avg,
        reviewCount: summary.count,
      }}
      related={relatedMapped}
    />
  );
}
