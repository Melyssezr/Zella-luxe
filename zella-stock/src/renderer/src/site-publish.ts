import { findByRef, setSitePublish, type CatalogProduct } from "./catalog";
import { colorKey, resolveColorHex } from "./color-hex";
import { loadSettings } from "./settings";

function siteUrl() {
  const fromSettings = loadSettings().siteUrl?.trim();
  return (fromSettings || import.meta.env.VITE_ZELLA_SITE_URL || "https://www.zellaluxe.net").replace(/\/$/, "");
}

function syncKey() {
  return (loadSettings().siteKey?.trim() || import.meta.env.VITE_ZELLA_STOCK_KEY || "zella-stock-dev") as string;
}

function usableImage(src?: string) {
  const value = src?.trim() ?? "";
  if (!value) return "";
  if (value.startsWith("data:image/") || value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/")) {
    return value;
  }
  return "";
}

function compactImage(src?: string) {
  const value = usableImage(src);
  if (!value.startsWith("data:image/")) return Promise.resolve(value);
  return new Promise<string>((resolve) => {
    const image = new Image();
    image.onload = () => {
      const max = 1400;
      const scale = Math.min(1, max / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(value);
        return;
      }
      ctx.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    image.onerror = () => resolve(value);
    image.src = value;
  });
}

async function payload(product: CatalogProduct) {
  const colors = await Promise.all(product.colors.map(async (name, index) => {
    const key = colorKey(name);
    const info =
      product.colorInfo.find((item) => colorKey(item.name) === key) ??
      product.colorInfo[index];
    return {
      nameFr: name,
      nameAr: info?.nameAr || name,
      hex: resolveColorHex(info?.hex, name),
      photo: await compactImage(info?.photo || (index === 0 ? product.photo : "")),
      sizes: product.variants
        .filter((row) => row.color === name)
        .map((row) => ({ size: row.size, qty: row.qty })),
    };
  }));

  const ready = colors.filter((row) => row.sizes.length > 0);
  const mainPhoto = await compactImage(product.photo);
  const images = [mainPhoto, ...ready.map((row) => row.photo)].filter(Boolean);

  return {
    reference: product.ref,
    nameFr: product.name,
    nameAr: product.nameAr,
    descriptionFr: product.description,
    descriptionAr: product.descriptionAr,
    category: product.category,
    price: product.price,
    uniquePrice: product.uniquePrice,
    sizePrices: product.sizePrices,
    onPromo: product.onPromo,
    promoPrice: product.promoPrice,
    featured: product.featured,
    images,
    colors: ready,
  };
}

function explainFailure(status: number, error?: string) {
  if (status === 401 || error === "Non autorisé") {
    return "Clé refusée. Dans Paramètres, mets exactement la même clé que ZELLA_STOCK_KEY sur Vercel.";
  }
  if (error) return error;
  if (status === 404) return "L’API n’est pas encore en ligne. Déploie le site zellaluxe.net avec le dernier code.";
  if (status === 0) return "Impossible de joindre zellaluxe.net. Vérifie l’adresse dans Paramètres et ta connexion.";
  return `Erreur ${status} côté site.`;
}

async function call(path: string, body: unknown) {
  const url = `${siteUrl()}${path}`;
  try {
    if (window.zellaStock?.siteRequest) {
      const result = await window.zellaStock.siteRequest({ url, key: syncKey(), body });
      if (!result.ok) throw new Error(explainFailure(result.status, result.data?.error));
      return result.data;
    }

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${syncKey()}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(explainFailure(res.status, typeof data.error === "string" ? data.error : undefined));
    return data as { id?: string; published?: boolean };
  } catch (error) {
    if (error instanceof Error && error.message === "Failed to fetch") {
      throw new Error("Impossible de joindre le site. Vérifie https://zellaluxe.net, la clé, et que le dernier code est bien déployé.");
    }
    throw error;
  }
}

export async function publishToSite(ref: string) {
  const product = findByRef(ref);
  if (!product) throw new Error("Produit introuvable dans Zella Stock.");
  if (product.colors.length === 0) throw new Error("Ajoutez au moins une couleur avant de publier.");
  const result = await call("/api/stock/publish", await payload(product));
  setSitePublish(product.ref, true, result.id ?? product.siteProductId);
}

export async function unpublishFromSite(ref: string) {
  const product = findByRef(ref);
  if (!product) throw new Error("Produit introuvable dans Zella Stock.");
  await call("/api/stock/unpublish", { reference: product.ref });
  setSitePublish(product.ref, false);
}
