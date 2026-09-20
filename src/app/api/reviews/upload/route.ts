import { NextResponse } from "next/server";
import {
  isRemoteMediaConfigured,
  remoteMediaSetupError,
  requiresRemoteUploads,
  uploadMediaImage,
} from "@/lib/media-storage";
import {
  assertSameOrigin,
  getClientIp,
  hashIp,
  isAllowedImageMime,
  looksLikeImageBuffer,
  rateLimit,
} from "@/lib/security";

export async function POST(request: Request) {
  try {
    if (!assertSameOrigin(request)) {
      return NextResponse.json({ error: "Origine non autorisée" }, { status: 403 });
    }

    const ip = getClientIp(request);
    const limit = rateLimit(`upload:${hashIp(ip)}`, { limit: 10, windowMs: 15 * 60 * 1000 });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Trop d'uploads. Réessayez plus tard." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
    }

    if (!isAllowedImageMime(file.type)) {
      return NextResponse.json({ error: "Formats acceptés : JPG, PNG, WEBP, GIF" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Max 5 Mo" }, { status: 400 });
    }

    if (requiresRemoteUploads() && !isRemoteMediaConfigured()) {
      return NextResponse.json({ error: remoteMediaSetupError() }, { status: 503 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!looksLikeImageBuffer(buffer, file.type)) {
      return NextResponse.json({ error: "Fichier image invalide" }, { status: 400 });
    }

    const url = await uploadMediaImage("reviews", buffer, file.type);
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur upload";
    const safe =
      message.includes("R2") ||
      message.includes("Cloudinary") ||
      message.includes("Upload") ||
      message.includes("configuré")
        ? message
        : "Erreur upload";
    return NextResponse.json({ error: safe }, { status: 500 });
  }
}
