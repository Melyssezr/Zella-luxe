import { getCachedGalleryImages } from "@/lib/storefront-data";
import { GalerieClient } from "./GalerieClient";

export default async function GaleriePage() {
  const images = await getCachedGalleryImages();

  return <GalerieClient images={images} />;
}
