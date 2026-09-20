import { findByRef, setSitePublish, type CatalogProduct } from "./catalog";
import { loadSettings } from "./settings";

function siteUrl() {
  const fromSettings = loadSettings().siteUrl?.trim();
  return (fromSettings || import.meta.env.VITE_ZELLA_SITE_URL || "https://zellaluxe.net").replace(/\/$/, "");
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

function payload(product: CatalogProduct) {
  const colors = product.colors.map((name) => {
    const info = product.colorInfo.find((item) => item.name === name);
    return {
      nameFr: name,
      nameAr: info?.nameAr || name,
      hex: info?.hex || "",
      photo: usableImage(info?.photo),
      sizes: product.variants
        .filter((row) => row.color === name)
        .map((row) => ({ size: row.size, qty: row.qty })),
    };
  }).filter((row) => row.sizes.length > 0);

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
    images: [usableImage(product.photo), ...colors.map((row) => row.photo)].filter(Boolean),
    colors,
  };
}

function explainFailure(status: number, error?: string) {
  if (error) return error;
  if (status === 401) return "Clé refusée. Mets la même ZELLA_STOCK_KEY sur zellaluxe.net et dans Paramètres.";
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
  const result = await call("/api/stock/publish", payload(product));
  setSitePublish(product.ref, true, result.id ?? product.siteProductId);
}

export async function unpublishFromSite(ref: string) {
  const product = findByRef(ref);
  if (!product) throw new Error("Produit introuvable dans Zella Stock.");
  await call("/api/stock/unpublish", { reference: product.ref });
  setSitePublish(product.ref, false);
}
