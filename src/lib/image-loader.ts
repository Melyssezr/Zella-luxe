"use client";

type ImageLoaderProps = {
  src: string;
  width: number;
  quality?: number;
};

const CLOUDINARY_DELIVERY_PREFIX = "https://res.cloudinary.com/";

/**
 * Uses Cloudinary's delivery CDN directly, avoiding Vercel image functions.
 * Local/static images are already optimized design assets and remain unchanged.
 */
export default function imageLoader({ src, width }: ImageLoaderProps): string {
  if (!src.startsWith(CLOUDINARY_DELIVERY_PREFIX) || !src.includes("/image/upload/")) {
    return src;
  }

  if (/\.svg(?:$|\?)/i.test(src)) {
    return src;
  }

  const safeWidth = Math.min(1600, Math.max(64, Math.round(width)));
  return src.replace(
    "/image/upload/",
    `/image/upload/f_auto,q_auto:eco,c_limit,w_${safeWidth}/`
  );
}
