import { createHash } from "crypto";

const buckets = new Map<string, { count: number; resetAt: number }>();
const MAX_BUCKETS = 5_000;

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function pruneBuckets(now: number) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, entry] of buckets) {
    if (now >= entry.resetAt) buckets.delete(key);
  }
  if (buckets.size >= MAX_BUCKETS) {
    // Drop oldest half if still bloated (serverless-friendly bound).
    let i = 0;
    for (const key of buckets.keys()) {
      if (i++ % 2 === 0) buckets.delete(key);
    }
  }
}

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  pruneBuckets(now);
  const entry = buckets.get(key);

  if (!entry || now >= entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (entry.count >= limit) {
    return { allowed: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

export function sanitizeText(value: unknown, maxLen = 500): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, maxLen);
}

export function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isSafeImageUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/")) return !trimmed.includes("..") && !trimmed.includes("\\");
  return isSafeHttpUrl(trimmed);
}

export function parsePositiveInt(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

export function parseBoundedFloat(value: unknown, min = 0, max = 1_000_000): number | null {
  const n = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

/** Algerian mobile: 05/06/07… or +213 / 213. */
export function isValidAlgerianPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (/^0[567]\d{8}$/.test(digits)) return true;
  if (/^213[567]\d{8}$/.test(digits)) return true;
  return false;
}

const ALLOWED_IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const ALLOWED_IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

export function isAllowedImageMime(mime: string): boolean {
  return ALLOWED_IMAGE_MIME.has(mime.toLowerCase());
}

export function isAllowedImageExt(ext: string): boolean {
  return ALLOWED_IMAGE_EXT.has(ext.toLowerCase());
}

/** Basic magic-byte check to reject non-image uploads renamed as images. */
export function looksLikeImageBuffer(buffer: Buffer, mime: string): boolean {
  if (buffer.length < 12) return false;
  const m = mime.toLowerCase();

  if (m === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (m === "image/png") {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }
  if (m === "image/gif") {
    return buffer.subarray(0, 3).toString("ascii") === "GIF";
  }
  if (m === "image/webp") {
    return (
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }
  return false;
}

/**
 * Reject cross-site mutating requests (CSRF mitigation for cookie auth).
 * Allows same-origin and requests without Origin (some same-site navigations).
 */
export function assertSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    // Prefer sec-fetch-site when available.
    const site = request.headers.get("sec-fetch-site");
    if (!site || site === "same-origin" || site === "same-site" || site === "none") return true;
    return false;
  }

  try {
    const reqOrigin = new URL(request.url).origin;
    return origin === reqOrigin;
  } catch {
    return false;
  }
}

export async function readJsonBody<T = unknown>(
  request: Request,
  maxBytes = 100_000
): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number }> {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > maxBytes) {
    return { ok: false, error: "Requête trop volumineuse", status: 413 };
  }

  try {
    const text = await request.text();
    if (text.length > maxBytes) {
      return { ok: false, error: "Requête trop volumineuse", status: 413 };
    }
    if (!text.trim()) {
      return { ok: false, error: "Corps vide", status: 400 };
    }
    return { ok: true, data: JSON.parse(text) as T };
  } catch {
    return { ok: false, error: "JSON invalide", status: 400 };
  }
}

export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}
