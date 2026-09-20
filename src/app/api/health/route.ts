import { NextResponse } from "next/server";
import { getSessionSecret } from "@/lib/auth-session";
import { isR2Configured, isRemoteMediaConfigured, isVercel } from "@/lib/media-storage";
import { isWhatsAppConfigured } from "@/lib/whatsapp";
import { isWorldExpressConfigured } from "@/lib/world-express";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, boolean> = {
    database: Boolean(process.env.DATABASE_URL),
    adminPassword: Boolean(process.env.ADMIN_PASSWORD?.trim()),
    adminSessionSecret: Boolean(getSessionSecret()),
    r2: isR2Configured(),
    remoteMedia: isRemoteMediaConfigured(),
    whatsapp: isWhatsAppConfigured(),
    worldExpress: isWorldExpressConfigured(),
  };

  const ok =
    checks.database &&
    checks.adminPassword &&
    checks.adminSessionSecret &&
    (!isVercel() || checks.remoteMedia);

  return NextResponse.json(
    {
      ok,
      checks,
    },
    { status: ok ? 200 : 503 }
  );
}
