import {
  authorizeStockBridge,
  jsonWithCors,
  stockBridgePreflight,
  unpublishStockProduct,
} from "@/lib/stock-bridge";

export function OPTIONS() {
  return stockBridgePreflight();
}

export async function POST(request: Request) {
  if (!authorizeStockBridge(request)) {
    return jsonWithCors({ error: "Non autorisé" }, 401);
  }

  let reference = "";
  try {
    const body = (await request.json()) as { reference?: string };
    reference = body.reference ?? "";
  } catch {
    return jsonWithCors({ error: "Requête invalide." }, 400);
  }

  try {
    return await unpublishStockProduct(reference);
  } catch {
    return jsonWithCors({ error: "Impossible de retirer le produit du site." }, 500);
  }
}
