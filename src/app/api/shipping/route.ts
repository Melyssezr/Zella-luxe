import { NextResponse } from "next/server";
import { getCheckoutShippingData } from "@/lib/shipping-server";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
};

export async function GET() {
  try {
    const { wilayas } = await getCheckoutShippingData();
    return NextResponse.json(wilayas, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error("[GET /api/shipping]", error);
    return NextResponse.json({ error: "Impossible de charger les wilayas" }, { status: 500 });
  }
}
