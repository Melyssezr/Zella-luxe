/** Images réservées au design (backgrounds, bannières) — jamais produits ni galerie */
export const DESIGN_ONLY_IMAGES = [
  "/images/hero-desktop.jpg",
  "/images/hero-mobile.jpg",
  "/images/neon-art.jpg",
] as const;

export function isDesignOnlyImage(url: string): boolean {
  return DESIGN_ONLY_IMAGES.some((img) => url === img || url.endsWith(img.replace("/images/", "")));
}

export const designAssets = {
  /** Bannière Hero — PC / tablette (picpc) */
  heroDesktop: "/images/hero-desktop.jpg",
  /** Bannière Hero — smartphone (pictlf) */
  heroMobile: "/images/hero-mobile.jpg",
  instagramBanner: "/images/neon-art.jpg",
} as const;

export const splashAssets = {
  /** Paysage — écran PC / tablette */
  background: "/images/background2.jpg",
  /** Portrait — écran téléphone (remplaçable : public/images/splash-background.jpg) */
  backgroundMobile: "/images/splash-background.jpg",
} as const;

export const siteAssets = {
  logo: "/images/logo.jpg",
} as const;
