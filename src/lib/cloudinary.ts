import { createHash, randomUUID } from "crypto";

/** Folders owned by this app — never destroy assets outside these prefixes. */
const OWNED_FOLDERS = [
  "zella-luxe/products",
  "zella-luxe/catalogs",
  "zella-luxe/gallery",
  "zella-luxe/reviews",
] as const;

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

function signParams(params: Record<string, string>): string {
  const secret = process.env.CLOUDINARY_API_SECRET!;
  const sorted = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(sorted + secret).digest("hex");
}

/**
 * Extract a destroyable public_id from a Cloudinary delivery URL belonging to
 * this project's cloud + owned folders. Returns null for Unsplash, /images/*, etc.
 */
export function extractOwnedCloudinaryPublicId(url: string): string | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName || !url || typeof url !== "string") return null;

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  if (parsed.hostname !== "res.cloudinary.com") return null;

  // /<cloud>/image/upload/.../<public_id>.<ext>
  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parts.length < 4) return null;
  if (parts[0] !== cloudName) return null;
  if (parts[1] !== "image" || parts[2] !== "upload") return null;

  const afterUpload = parts.slice(3);
  // Drop optional transformation segments and version (v1234567890)
  let i = 0;
  while (i < afterUpload.length) {
    const seg = afterUpload[i];
    if (/^v\d+$/.test(seg)) {
      i += 1;
      break;
    }
    // Transformation segment (contains comma or underscore params like c_fill,w_300)
    if (seg.includes(",") || /^[a-z]+_/.test(seg)) {
      i += 1;
      continue;
    }
    break;
  }

  const publicIdParts = afterUpload.slice(i);
  if (publicIdParts.length === 0) return null;

  // Strip file extension from last segment
  const last = publicIdParts[publicIdParts.length - 1].replace(/\.[a-zA-Z0-9]+$/, "");
  const publicId = [...publicIdParts.slice(0, -1), last].join("/");

  const owned = OWNED_FOLDERS.some(
    (folder) => publicId === folder || publicId.startsWith(`${folder}/`)
  );
  if (!owned) return null;

  return publicId;
}

/**
 * Best-effort destroy of a single Cloudinary image by delivery URL.
 * Skips non-Cloudinary / foreign-cloud / non-owned-folder URLs.
 * Never throws — logs and returns false on failure.
 */
export async function deleteCloudinaryImage(url: string): Promise<boolean> {
  const publicId = extractOwnedCloudinaryPublicId(url);
  if (!publicId) return false;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    console.warn("[cloudinary] delete skipped — not configured:", publicId);
    return false;
  }

  try {
    const timestamp = String(Math.round(Date.now() / 1000));
    const signPayload: Record<string, string> = {
      public_id: publicId,
      timestamp,
    };
    const signature = signParams(signPayload);

    const body = new FormData();
    body.append("public_id", publicId);
    body.append("api_key", apiKey);
    body.append("timestamp", timestamp);
    body.append("signature", signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
      method: "POST",
      body,
    });

    const data = (await res.json()) as { result?: string; error?: { message?: string } };
    if (!res.ok || (data.result !== "ok" && data.result !== "not found")) {
      console.warn(
        "[cloudinary] destroy failed:",
        publicId,
        data.error?.message ?? data.result ?? res.status
      );
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[cloudinary] destroy error:", publicId, err);
    return false;
  }
}

/** Delete many URLs; continues on individual failures. Deduplicates. */
export async function deleteCloudinaryImages(urls: Iterable<string | null | undefined>): Promise<void> {
  const unique = [...new Set([...urls].filter((u): u is string => Boolean(u)))];
  await Promise.all(unique.map((url) => deleteCloudinaryImage(url)));
}

/** Collect product image URLs from `images` + legacy `colors` + nested `variants` color images. */
export function collectProductImageUrls(
  imagesJson: string,
  colorsJson: string,
  variantsJson?: string | null
): string[] {
  const urls: string[] = [];

  try {
    const images = JSON.parse(imagesJson || "[]");
    if (Array.isArray(images)) {
      for (const item of images) {
        if (typeof item === "string" && item) urls.push(item);
      }
    }
  } catch {
    /* ignore malformed */
  }

  try {
    const colors = JSON.parse(colorsJson || "[]");
    if (Array.isArray(colors)) {
      for (const color of colors) {
        if (color && typeof color.image === "string" && color.image) {
          urls.push(color.image);
        }
      }
    }
  } catch {
    /* ignore malformed */
  }

  try {
    const variants = JSON.parse(variantsJson || "[]");
    // v2 object: { colors: [{ image, sizes }] }
    if (variants && typeof variants === "object" && !Array.isArray(variants)) {
      const colors = Array.isArray(variants.colors) ? variants.colors : [];
      for (const color of colors) {
        if (color && typeof color.image === "string" && color.image) {
          urls.push(color.image);
        }
      }
    } else if (Array.isArray(variants)) {
      for (const row of variants) {
        // v2 color-first array
        if (row && typeof row.image === "string" && row.image) {
          urls.push(row.image);
        }
        // v1 size-first
        const colors = Array.isArray(row?.colors) ? row.colors : [];
        for (const color of colors) {
          if (color && typeof color.image === "string" && color.image) {
            urls.push(color.image);
          }
        }
      }
    }
  } catch {
    /* ignore malformed */
  }

  return urls;
}

/** Collect review photo URLs from `photos` JSON array. */
export function collectReviewPhotoUrls(photosJson: string): string[] {
  try {
    const photos = JSON.parse(photosJson || "[]");
    if (!Array.isArray(photos)) return [];
    return photos.filter((p): p is string => typeof p === "string" && Boolean(p));
  } catch {
    return [];
  }
}

export async function uploadImageToCloudinary(
  buffer: Buffer,
  mime: string,
  folder: string
): Promise<string> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary non configuré");
  }

  const timestamp = String(Math.round(Date.now() / 1000));
  const publicId = randomUUID();

  const signPayload: Record<string, string> = {
    folder,
    public_id: publicId,
    timestamp,
  };
  const signature = signParams(signPayload);

  const body = new FormData();
  body.append("file", new Blob([new Uint8Array(buffer)], { type: mime }));
  body.append("api_key", apiKey);
  body.append("timestamp", timestamp);
  body.append("signature", signature);
  body.append("folder", folder);
  body.append("public_id", publicId);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body,
  });

  const data = (await res.json()) as { secure_url?: string; error?: { message?: string } };
  if (!res.ok || !data.secure_url) {
    throw new Error(data.error?.message ?? "Upload Cloudinary échoué");
  }

  return data.secure_url;
}

export async function uploadReviewImage(buffer: Buffer, mime: string): Promise<string> {
  return uploadImageToCloudinary(buffer, mime, "zella-luxe/reviews");
}

export async function uploadCatalogImage(buffer: Buffer, mime: string): Promise<string> {
  return uploadImageToCloudinary(buffer, mime, "zella-luxe/catalogs");
}

export async function uploadProductImage(buffer: Buffer, mime: string): Promise<string> {
  return uploadImageToCloudinary(buffer, mime, "zella-luxe/products");
}

export async function uploadGalleryImage(buffer: Buffer, mime: string): Promise<string> {
  return uploadImageToCloudinary(buffer, mime, "zella-luxe/gallery");
}
