import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "zl_pv";
/** Don't recount the same product for this visitor within 30 minutes. */
const VIEW_WINDOW_SEC = 30 * 60;
const MAX_IDS_IN_COOKIE = 40;

function parseViewedIds(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0 && id.length <= 40);
}

/**
 * Product view counter — DB-light:
 * - Cookie already seen → 0 DB queries
 * - Else → 1 updateMany (no prior findFirst)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id || id.length > 40) {
    return NextResponse.json({ error: "Produit invalide" }, { status: 400 });
  }

  const ip = getClientIp(request);
  const limit = rateLimit(`product-view:${ip}`, { limit: 60, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  const cookieStore = await cookies();
  const viewed = parseViewedIds(cookieStore.get(COOKIE_NAME)?.value);

  // Already counted for this visitor window → no DB hit
  if (viewed.includes(id)) {
    return NextResponse.json({ counted: false });
  }

  const result = await prisma.product.updateMany({
    where: { id, active: true },
    data: { viewCount: { increment: 1 } },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
  }

  const nextViewed = [...viewed.filter((v) => v !== id), id].slice(-MAX_IDS_IN_COOKIE);
  const response = NextResponse.json({ counted: true });
  response.cookies.set(COOKIE_NAME, nextViewed.join(","), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: VIEW_WINDOW_SEC,
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
