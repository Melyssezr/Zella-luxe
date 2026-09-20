import { getRatingSummary, toStorefrontProduct } from "@/lib/utils";
import { getCachedPromotionProducts } from "@/lib/storefront-data";
import { PromotionsClient } from "./PromotionsClient";

export default async function PromotionsPage() {
  const products = await getCachedPromotionProducts();

  const mapped = products.map(({ reviews, ...product }) => {
    const { avg, count } = getRatingSummary(reviews);
    return { ...toStorefrontProduct(product), avgRating: avg, reviewCount: count };
  });

  return <PromotionsClient products={mapped} />;
}
