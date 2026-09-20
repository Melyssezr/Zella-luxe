import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import {
  isWorldExpressConfigured,
  testWorldExpressCredentials,
  getWorldExpressConfig,
} from "@/lib/world-express";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  if (!isWorldExpressConfigured()) {
    return NextResponse.json({
      configured: false,
      ok: false,
      error: "WORLD_EXPRESS_TOKEN manquant",
    });
  }

  const test = await testWorldExpressCredentials();
  return NextResponse.json({
    configured: true,
    ok: test.ok,
    error: test.error,
    baseUrl: getWorldExpressConfig()?.baseUrl,
  });
}
