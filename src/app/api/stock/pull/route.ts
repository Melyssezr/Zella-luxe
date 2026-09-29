import { authorizeStockBridge, jsonWithCors, pullStockCatalog, stockBridgePreflight } from "@/lib/stock-bridge";

export function OPTIONS() {
  return stockBridgePreflight();
}

export async function GET(request: Request) {
  if (!authorizeStockBridge(request)) {
    return jsonWithCors({ error: "Non autorisé" }, 401);
  }
  try {
    return await pullStockCatalog();
  } catch {
    return jsonWithCors({ error: "Impossible de lire le catalogue site." }, 500);
  }
}
