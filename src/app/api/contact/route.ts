import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";
import { isValidInstagramHandle, normalizeInstagramHandle } from "@/lib/instagram";
import {
  assertSameOrigin,
  getClientIp,
  hashIp,
  rateLimit,
  readJsonBody,
  sanitizeText,
} from "@/lib/security";

export async function POST(request: Request) {
  try {
    if (!assertSameOrigin(request)) {
      return NextResponse.json({ error: "Origine non autorisée" }, { status: 403 });
    }

    const ip = getClientIp(request);
    const limit = rateLimit(`contact:${hashIp(ip)}`, { limit: 6, windowMs: 15 * 60 * 1000 });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Trop de messages. Réessayez plus tard." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const parsed = await readJsonBody<{
      name?: unknown;
      instagramHandle?: unknown;
      phone?: unknown;
      message?: unknown;
    }>(request, 20_000);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }

    const name = sanitizeText(parsed.data.name, 120);
    const instagramHandle = parsed.data.instagramHandle
      ? sanitizeText(parsed.data.instagramHandle, 80)
      : null;
    const phone = parsed.data.phone ? sanitizeText(parsed.data.phone, 30) : null;
    const message = sanitizeText(parsed.data.message, 3000);

    if (!name || !message) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }

    if (instagramHandle && !isValidInstagramHandle(instagramHandle)) {
      return NextResponse.json({ error: "Pseudo Instagram invalide" }, { status: 400 });
    }

    const msg = await prisma.contactMessage.create({
      data: {
        name,
        instagramHandle: instagramHandle ? normalizeInstagramHandle(instagramHandle) : null,
        phone,
        message,
      },
    });

    return NextResponse.json({ id: msg.id, ok: true });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const messages = await prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(messages);
}
