import { NextResponse } from "next/server";
import { getCheckoutShippingData } from "@/lib/shipping-server";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wilayaCode = searchParams.get("wilayaCode");

  if (!wilayaCode) {
    return NextResponse.json({ error: "wilayaCode requis" }, { status: 400 });
  }

  try {
    const { officesByWilaya } = await getCheckoutShippingData();
    return NextResponse.json(officesByWilaya[wilayaCode] ?? [], {
      headers: CACHE_HEADERS,
    });
  } catch (error) {
    console.error("[GET /api/shipping/offices]", error);
    return NextResponse.json({ error: "Impossible de charger les bureaux" }, { status: 500 });
  }
}
