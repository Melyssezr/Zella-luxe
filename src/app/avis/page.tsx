import { getCachedReviewFormProducts } from "@/lib/storefront-data";
import AvisClient from "./AvisClient";

export default async function AvisPage() {
  const products = await getCachedReviewFormProducts();

  return <AvisClient products={products} />;
}
