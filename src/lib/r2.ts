import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  /** Public base URL without trailing slash (custom domain or https://pub-xxx.r2.dev) */
  publicUrl: string;
};

export function getR2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET_NAME?.trim();
  const publicUrl = process.env.R2_PUBLIC_URL?.trim().replace(/\/$/, "");

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    return null;
  }
  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl };
}

export function isR2Configured(): boolean {
  return Boolean(getR2Config());
}

let cachedClient: S3Client | null = null;

function getClient(config: R2Config): S3Client {
  if (cachedClient) return cachedClient;
  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  return cachedClient;
}

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function extensionForMime(mime: string, fallback = "jpg"): string {
  return MIME_TO_EXT[mime.toLowerCase()] || fallback;
}

/** Upload buffer to R2 under `{folder}/{uuid}.{ext}` and return public HTTPS URL. */
export async function uploadToR2(
  buffer: Buffer,
  mime: string,
  folder: string
): Promise<string> {
  const config = getR2Config();
  if (!config) throw new Error("R2 non configuré");

  const ext = extensionForMime(mime);
  const key = `${folder.replace(/^\/+|\/+$/g, "")}/${randomUUID()}.${ext}`;
  const client = getClient(config);

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: buffer,
      ContentType: mime,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return `${config.publicUrl}/${key}`;
}

/**
 * Delete an object if the URL belongs to our R2 public base.
 * Returns false when the URL is not ours or delete fails.
 */
export async function deleteFromR2(url: string): Promise<boolean> {
  const config = getR2Config();
  if (!config || !url) return false;

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return false;
  }

  let publicBase: URL;
  try {
    publicBase = new URL(config.publicUrl);
  } catch {
    return false;
  }

  if (parsed.origin !== publicBase.origin) return false;

  const basePath = publicBase.pathname.replace(/\/$/, "");
  let key = decodeURIComponent(parsed.pathname);
  if (basePath && key.startsWith(basePath)) {
    key = key.slice(basePath.length);
  }
  key = key.replace(/^\/+/, "");
  if (!key || key.includes("..")) return false;

  // Only delete objects under our known folders
  const owned = ["products/", "catalogs/", "gallery/", "reviews/"].some((p) =>
    key.startsWith(p)
  );
  if (!owned) return false;

  try {
    const client = getClient(config);
    await client.send(
      new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: key,
      })
    );
    return true;
  } catch (err) {
    console.warn("[r2] delete error:", key, err);
    return false;
  }
}
