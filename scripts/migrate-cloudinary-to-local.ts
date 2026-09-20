/**
 * Emergency migration: download Cloudinary images to /public/media
 * and rewrite DB URLs to local paths before Cloudinary deactivation.
 *
 * Usage: npx tsx scripts/migrate-cloudinary-to-local.ts
 */
import { createHash } from "crypto";
import { mkdir, writeFile, access } from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const MEDIA_ROOT = path.join(process.cwd(), "public", "media");
const DRY_RUN = process.argv.includes("--dry-run");
const APPLY = process.argv.includes("--apply") || !DRY_RUN;

type UrlMap = Map<string, string>; // original -> /media/...

function isCloudinaryUrl(value: unknown): value is string {
  return typeof value === "string" && value.includes("res.cloudinary.com");
}

function compressDeliveryUrl(url: string): string {
  if (!url.includes("/image/upload/")) return url;
  // Avoid double-transform if already transformed
  if (/\/image\/upload\/(?:[^/]+,)+/.test(url) || url.includes("/image/upload/f_auto")) {
    return url;
  }
  return url.replace(
    "/image/upload/",
    "/image/upload/f_auto,q_auto:eco,c_limit,w_1600/"
  );
}

function localPathFor(url: string): { abs: string; publicPath: string } {
  const hash = createHash("sha1").update(url).digest("hex").slice(0, 16);
  let folder = "misc";
  if (url.includes("/products/")) folder = "products";
  else if (url.includes("/catalogs/")) folder = "catalogs";
  else if (url.includes("/gallery/")) folder = "gallery";
  else if (url.includes("/reviews/")) folder = "reviews";

  // Prefer webp extension for compressed delivery; keep original as fallback hint
  const extMatch = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  const originalExt = (extMatch?.[1] || "jpg").toLowerCase();
  const file = `${hash}.${originalExt === "png" || originalExt === "webp" || originalExt === "jpg" || originalExt === "jpeg" || originalExt === "gif" ? (originalExt === "jpeg" ? "jpg" : originalExt) : "jpg"}`;

  const rel = path.posix.join("media", folder, file);
  return {
    abs: path.join(process.cwd(), "public", rel),
    publicPath: `/${rel}`,
  };
}

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function downloadOne(url: string): Promise<{ publicPath: string; bytes: number; skipped: boolean }> {
  const { abs, publicPath } = localPathFor(url);
  await mkdir(path.dirname(abs), { recursive: true });

  if (await fileExists(abs)) {
    return { publicPath, bytes: 0, skipped: true };
  }

  const delivery = compressDeliveryUrl(url);
  const res = await fetch(delivery, {
    headers: { Accept: "image/avif,image/webp,image/*,*/*" },
  });
  if (!res.ok) {
    // Fallback to original if transform fails
    const fallback = await fetch(url);
    if (!fallback.ok) {
      throw new Error(`Download failed ${res.status} for ${url}`);
    }
    const buf = Buffer.from(await fallback.arrayBuffer());
    await writeFile(abs, buf);
    return { publicPath, bytes: buf.length, skipped: false };
  }

  const buf = Buffer.from(await res.arrayBuffer());
  // If Cloudinary returned webp, rewrite extension when possible
  const contentType = res.headers.get("content-type") || "";
  let finalAbs = abs;
  let finalPublic = publicPath;
  if (contentType.includes("webp") && !abs.endsWith(".webp")) {
    finalAbs = abs.replace(/\.[^.]+$/, ".webp");
    finalPublic = publicPath.replace(/\.[^.]+$/, ".webp");
  } else if (contentType.includes("jpeg") && !abs.endsWith(".jpg") && !abs.endsWith(".jpeg")) {
    finalAbs = abs.replace(/\.[^.]+$/, ".jpg");
    finalPublic = publicPath.replace(/\.[^.]+$/, ".jpg");
  }

  await writeFile(finalAbs, buf);
  return { publicPath: finalPublic, bytes: buf.length, skipped: false };
}

function collectFromJsonArray(raw: string | null | undefined, urls: Set<string>) {
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    for (const item of parsed) {
      if (isCloudinaryUrl(item)) urls.add(item.trim());
    }
  } catch {
    /* ignore */
  }
}

function collectFromColors(raw: string | null | undefined, urls: Set<string>) {
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    for (const color of parsed) {
      if (isCloudinaryUrl(color?.image)) urls.add(String(color.image).trim());
    }
  } catch {
    /* ignore */
  }
}

function collectFromVariants(raw: string | null | undefined, urls: Set<string>) {
  if (!raw) return;
  try {
    const variants = JSON.parse(raw);
    if (variants && typeof variants === "object" && !Array.isArray(variants)) {
      const colors = Array.isArray(variants.colors) ? variants.colors : [];
      for (const color of colors) {
        if (isCloudinaryUrl(color?.image)) urls.add(String(color.image).trim());
      }
      return;
    }
    if (Array.isArray(variants)) {
      for (const row of variants) {
        if (isCloudinaryUrl(row?.image)) urls.add(String(row.image).trim());
        const colors = Array.isArray(row?.colors) ? row.colors : [];
        for (const color of colors) {
          if (isCloudinaryUrl(color?.image)) urls.add(String(color.image).trim());
        }
      }
    }
  } catch {
    /* ignore */
  }
}

function rewriteString(value: string, map: UrlMap): string {
  return map.get(value) ?? value;
}

function rewriteJsonArray(raw: string, map: UrlMap): string {
  try {
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return raw;
    const next = parsed.map((item) => (typeof item === "string" ? rewriteString(item, map) : item));
    return JSON.stringify(next);
  } catch {
    return raw;
  }
}

function rewriteColors(raw: string, map: UrlMap): string {
  try {
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return raw;
    const next = parsed.map((color) => {
      if (!color || typeof color !== "object") return color;
      if (typeof color.image === "string" && map.has(color.image)) {
        return { ...color, image: map.get(color.image) };
      }
      return color;
    });
    return JSON.stringify(next);
  } catch {
    return raw;
  }
}

function rewriteVariants(raw: string | null, map: UrlMap): string | null {
  if (!raw) return raw;
  try {
    const variants = JSON.parse(raw);
    if (variants && typeof variants === "object" && !Array.isArray(variants)) {
      const colors = Array.isArray(variants.colors) ? variants.colors : [];
      return JSON.stringify({
        ...variants,
        colors: colors.map((color: Record<string, unknown>) => {
          if (typeof color?.image === "string" && map.has(color.image)) {
            return { ...color, image: map.get(color.image) };
          }
          return color;
        }),
      });
    }
    if (Array.isArray(variants)) {
      return JSON.stringify(
        variants.map((row) => {
          const next = { ...row };
          if (typeof row?.image === "string" && map.has(row.image)) {
            next.image = map.get(row.image);
          }
          if (Array.isArray(row?.colors)) {
            next.colors = row.colors.map((color: Record<string, unknown>) => {
              if (typeof color?.image === "string" && map.has(color.image)) {
                return { ...color, image: map.get(color.image) };
              }
              return color;
            });
          }
          return next;
        })
      );
    }
  } catch {
    /* ignore */
  }
  return raw;
}

async function main() {
  console.log("Scanning database for Cloudinary URLs…");
  const [products, galleries, catalogs, reviews, orders] = await Promise.all([
    prisma.product.findMany({
      select: { id: true, images: true, colors: true, variants: true },
    }),
    prisma.galleryImage.findMany({ select: { id: true, url: true } }),
    prisma.catalog.findMany({ select: { id: true, coverImage: true } }),
    prisma.review.findMany({ select: { id: true, photos: true } }),
    prisma.order.findMany({ select: { id: true, items: true } }),
  ]);

  const urls = new Set<string>();
  for (const p of products) {
    collectFromJsonArray(p.images, urls);
    collectFromColors(p.colors, urls);
    collectFromVariants(p.variants, urls);
  }
  for (const g of galleries) if (isCloudinaryUrl(g.url)) urls.add(g.url.trim());
  for (const c of catalogs) if (isCloudinaryUrl(c.coverImage)) urls.add(c.coverImage.trim());
  for (const r of reviews) collectFromJsonArray(r.photos, urls);
  for (const o of orders) {
    try {
      const items = JSON.parse(o.items || "[]");
      if (Array.isArray(items)) {
        for (const item of items) {
          if (isCloudinaryUrl(item?.image)) urls.add(String(item.image).trim());
        }
      }
    } catch {
      /* ignore */
    }
  }

  const list = [...urls];
  console.log(`Found ${list.length} unique Cloudinary URLs`);
  await mkdir(MEDIA_ROOT, { recursive: true });

  const map: UrlMap = new Map();
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  let totalBytes = 0;

  for (let i = 0; i < list.length; i++) {
    const url = list[i];
    try {
      const result = await downloadOne(url);
      map.set(url, result.publicPath);
      if (result.skipped) skipped += 1;
      else {
        downloaded += 1;
        totalBytes += result.bytes;
      }
      if ((i + 1) % 20 === 0 || i === list.length - 1) {
        console.log(
          `Progress ${i + 1}/${list.length} · downloaded=${downloaded} skipped=${skipped} failed=${failed} · ${(totalBytes / 1024 / 1024).toFixed(1)} MB`
        );
      }
    } catch (err) {
      failed += 1;
      console.error(`FAIL [${i + 1}/${list.length}]`, url, err instanceof Error ? err.message : err);
    }
  }

  if (!APPLY) {
    console.log("Dry run — DB not updated. Re-run with --apply");
    return;
  }

  console.log("Updating database URLs…");
  let productsUpdated = 0;
  for (const p of products) {
    const images = rewriteJsonArray(p.images, map);
    const colors = rewriteColors(p.colors, map);
    const variants = rewriteVariants(p.variants, map);
    if (images !== p.images || colors !== p.colors || variants !== p.variants) {
      await prisma.product.update({
        where: { id: p.id },
        data: {
          images,
          colors,
          ...(variants !== null ? { variants } : {}),
        },
      });
      productsUpdated += 1;
    }
  }

  let galleriesUpdated = 0;
  for (const g of galleries) {
    if (isCloudinaryUrl(g.url) && map.has(g.url.trim())) {
      await prisma.galleryImage.update({
        where: { id: g.id },
        data: { url: map.get(g.url.trim())! },
      });
      galleriesUpdated += 1;
    }
  }

  let catalogsUpdated = 0;
  for (const c of catalogs) {
    if (isCloudinaryUrl(c.coverImage) && map.has(c.coverImage.trim())) {
      await prisma.catalog.update({
        where: { id: c.id },
        data: { coverImage: map.get(c.coverImage.trim())! },
      });
      catalogsUpdated += 1;
    }
  }

  let reviewsUpdated = 0;
  for (const r of reviews) {
    const photos = rewriteJsonArray(r.photos, map);
    if (photos !== r.photos) {
      await prisma.review.update({
        where: { id: r.id },
        data: { photos },
      });
      reviewsUpdated += 1;
    }
  }

  let ordersUpdated = 0;
  for (const o of orders) {
    try {
      const items = JSON.parse(o.items || "[]");
      if (!Array.isArray(items)) continue;
      let changed = false;
      const next = items.map((item) => {
        if (item && typeof item.image === "string" && map.has(item.image)) {
          changed = true;
          return { ...item, image: map.get(item.image) };
        }
        return item;
      });
      if (changed) {
        await prisma.order.update({
          where: { id: o.id },
          data: { items: JSON.stringify(next) },
        });
        ordersUpdated += 1;
      }
    } catch {
      /* ignore */
    }
  }

  console.log(
    JSON.stringify(
      {
        urls: list.length,
        downloaded,
        skipped,
        failed,
        totalMB: Number((totalBytes / 1024 / 1024).toFixed(2)),
        productsUpdated,
        galleriesUpdated,
        catalogsUpdated,
        reviewsUpdated,
        ordersUpdated,
      },
      null,
      2
    )
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
