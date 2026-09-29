import {
  authorizeStockBridge,
  jsonWithCors,
  stockBridgePreflight,
  updateStockQuantities,
  type StockQtyItem,
} from "@/lib/stock-bridge";

export function OPTIONS() {
  return stockBridgePreflight();
}

export async function POST(request: Request) {
  if (!authorizeStockBridge(request)) {
    return jsonWithCors({ error: "Non autorisé" }, 401);
  }
  try {
    const body = (await request.json()) as { items?: StockQtyItem[] };
    return await updateStockQuantities(Array.isArray(body.items) ? body.items : []);
  } catch {
    return jsonWithCors({ error: "Impossible de mettre à jour les quantités." }, 500);
  }
}
