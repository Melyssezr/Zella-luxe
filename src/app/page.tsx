import { HomeClient } from "@/components/HomeClient";
import { getRatingSummary, toStorefrontProduct } from "@/lib/utils";
import { getActiveCatalogs } from "@/lib/catalogs";
import { getCachedHomeData } from "@/lib/storefront-data";

export default async function HomePage() {
  const [{ featured: featuredRaw, promos: promosRaw, gallery, reviews }, catalogs] =
    await Promise.all([
      getCachedHomeData(),
      getActiveCatalogs(),
    ]);

  const mapRatings = <T extends { reviews: { rating: number }[]; reference?: string | null }>(
    items: T[]
  ) =>
    items.map(({ reviews, ...product }) => {
      const { avg, count } = getRatingSummary(reviews);
      return { ...toStorefrontProduct(product), avgRating: avg, reviewCount: count };
    });

  const featured = mapRatings(featuredRaw);
  const promos = mapRatings(promosRaw);

  return (
    <HomeClient
      featured={featured}
      promos={promos}
      gallery={gallery}
      reviews={reviews}
      catalogs={catalogs}
    />
  );
}
