import { NextResponse } from "next/server";
import { fetchWorldExpressCommunes } from "@/lib/world-express";

export const dynamic = "force-dynamic";

/**
 * Communes officielles World Express pour une wilaya (liste déroulante checkout).
 * GET /api/shipping/communes?wilaya=16
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wilaya = searchParams.get("wilaya")?.trim() ?? "";
  if (!wilaya) {
    return NextResponse.json({ error: "Paramètre wilaya requis" }, { status: 400 });
  }

  const result = await fetchWorldExpressCommunes(wilaya);
  if (!result.ok) {
    return NextResponse.json({ error: result.error, communes: [] }, { status: 502 });
  }

  return NextResponse.json(
    { communes: result.communes },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
