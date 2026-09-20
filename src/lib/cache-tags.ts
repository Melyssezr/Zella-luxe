import { revalidateTag } from "next/cache";

export const CACHE_TAGS = {
  products: "storefront-products",
  catalogs: "storefront-catalogs",
  gallery: "storefront-gallery",
  reviews: "storefront-reviews",
  settings: "storefront-settings",
  shipping: "storefront-shipping",
} as const;

export type StorefrontCacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

export function expireStorefrontCache(...tags: StorefrontCacheTag[]) {
  for (const tag of new Set(tags)) {
    revalidateTag(tag, { expire: 0 });
  }
}
