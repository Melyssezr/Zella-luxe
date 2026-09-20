import {
  authorizeStockBridge,
  jsonWithCors,
  publishStockProduct,
  stockBridgePreflight,
  type StockPublishBody,
} from "@/lib/stock-bridge";

export function OPTIONS() {
  return stockBridgePreflight();
}

export async function POST(request: Request) {
  if (!authorizeStockBridge(request)) {
    return jsonWithCors({ error: "Non autorisé" }, 401);
  }

  let body: StockPublishBody;
  try {
    body = (await request.json()) as StockPublishBody;
  } catch {
    return jsonWithCors({ error: "Requête invalide." }, 400);
  }

  try {
    return await publishStockProduct(body);
  } catch {
    return jsonWithCors({ error: "Impossible de publier le produit." }, 500);
  }
}
