import { NextResponse } from "next/server";
import { verifyAdminPassword, createAdminSession, getSessionSecret } from "@/lib/auth";
import { assertSameOrigin, getClientIp, hashIp, rateLimit, readJsonBody } from "@/lib/security";

export async function POST(request: Request) {
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ error: "Origine non autorisée" }, { status: 403 });
  }

  if (!getSessionSecret()) {
    return NextResponse.json(
      {
        error:
          "Configuration admin incomplète. Définissez ADMIN_SESSION_SECRET (min. 32 caractères) et ADMIN_PASSWORD.",
      },
      { status: 503 }
    );
  }

  const ip = getClientIp(request);
  const limit = rateLimit(`admin-login:${hashIp(ip)}`, { limit: 5, windowMs: 15 * 60 * 1000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez plus tard." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  const parsed = await readJsonBody<{ password?: unknown }>(request, 4_000);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const password = typeof parsed.data.password === "string" ? parsed.data.password.slice(0, 200) : "";

  if (!(await verifyAdminPassword(password))) {
    return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });
  }

  const ok = await createAdminSession();
  if (!ok) {
    return NextResponse.json({ error: "Impossible de créer la session" }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
