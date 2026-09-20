import { Suspense } from "react";
import { getRatingSummary, toStorefrontProduct } from "@/lib/utils";
import { getActiveCatalogs } from "@/lib/catalogs";
import { getCachedCatalogueProducts } from "@/lib/storefront-data";
import { CatalogueClient } from "./CatalogueClient";

export default async function CataloguePage() {
  const [products, catalogs] = await Promise.all([
    getCachedCatalogueProducts(),
    getActiveCatalogs(),
  ]);

  const mapped = products.map(({ reviews, ...product }) => {
    const { avg, count } = getRatingSummary(reviews);
    return { ...toStorefrontProduct(product), avgRating: avg, reviewCount: count };
  });

  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <CatalogueClient products={mapped} catalogs={catalogs} />
    </Suspense>
  );
}
