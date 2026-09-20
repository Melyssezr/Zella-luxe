import { writeFile, mkdir } from "fs/promises";
import { randomUUID } from "crypto";
import {
  deleteCloudinaryImage,
  deleteCloudinaryImages,
  uploadCatalogImage as uploadCloudinaryCatalog,
  uploadGalleryImage as uploadCloudinaryGallery,
  uploadProductImage as uploadCloudinaryProduct,
  uploadReviewImage as uploadCloudinaryReview,
} from "@/lib/cloudinary";
import {
  deleteFromR2,
  extensionForMime,
  isR2Configured,
  uploadToR2,
} from "@/lib/r2";
import {
  getUploadDir,
  getUploadPublicUrl,
  isVercel,
  requiresRemoteUploads,
} from "@/lib/uploads";

export type MediaFolder = "products" | "catalogs" | "gallery" | "reviews";

/** Prefer R2; Cloudinary only as legacy fallback if R2 missing but still configured. */
export function isRemoteMediaConfigured(): boolean {
  return isR2Configured() || isCloudinaryFallbackConfigured();
}

function isCloudinaryFallbackConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

export function remoteMediaSetupError(): string {
  if (isR2Configured()) return "";
  return (
    "Upload désactivé : configurez R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME et R2_PUBLIC_URL."
  );
}

/**
 * Upload an image:
 * 1) Cloudflare R2 if configured (preferred)
 * 2) Local disk when not on Vercel
 * 3) Cloudinary only if R2 missing but Cloudinary still configured (legacy)
 */
export async function uploadMediaImage(
  folder: MediaFolder,
  buffer: Buffer,
  mime: string
): Promise<string> {
  if (isR2Configured()) {
    return uploadToR2(buffer, mime, folder);
  }

  if (!requiresRemoteUploads()) {
    const ext = extensionForMime(mime);
    const filename = `${randomUUID()}.${ext}`;
    const uploadDir = getUploadDir(folder);
    await mkdir(uploadDir, { recursive: true });
    await writeFile(`${uploadDir}/${filename}`, buffer);
    return getUploadPublicUrl(folder, filename);
  }

  // Legacy fallback — remove once R2 is live everywhere
  if (isCloudinaryFallbackConfigured()) {
    switch (folder) {
      case "products":
        return uploadCloudinaryProduct(buffer, mime);
      case "catalogs":
        return uploadCloudinaryCatalog(buffer, mime);
      case "gallery":
        return uploadCloudinaryGallery(buffer, mime);
      case "reviews":
        return uploadCloudinaryReview(buffer, mime);
    }
  }

  throw new Error(remoteMediaSetupError());
}

/** Delete remote asset (R2 and/or legacy Cloudinary). Local /media paths are no-ops. */
export async function deleteMediaImage(url: string): Promise<boolean> {
  if (!url || url.startsWith("/")) return false;
  const r2 = await deleteFromR2(url);
  if (r2) return true;
  return deleteCloudinaryImage(url);
}

export async function deleteMediaImages(
  urls: Iterable<string | null | undefined>
): Promise<void> {
  const unique = [...new Set([...urls].filter((u): u is string => Boolean(u)))];
  const cloudinary: string[] = [];
  await Promise.all(
    unique.map(async (url) => {
      if (url.startsWith("/")) return;
      const deleted = await deleteFromR2(url);
      if (!deleted) cloudinary.push(url);
    })
  );
  if (cloudinary.length > 0) {
    await deleteCloudinaryImages(cloudinary);
  }
}

export { isR2Configured, isVercel, requiresRemoteUploads };
