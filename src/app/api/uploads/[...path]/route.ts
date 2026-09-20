import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { getUploadRoot, isVercel } from "@/lib/uploads";

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  if (isVercel() || !process.env.UPLOAD_DIR) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const segments = (await params).path;
  if (
    !segments?.length ||
    segments.some((s) => !s || s.includes("..") || s.includes("\\") || s.includes("\0") || path.isAbsolute(s))
  ) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const root = path.resolve(getUploadRoot());
  const filePath = path.resolve(root, ...segments);
  if (!filePath.startsWith(root + path.sep) && filePath !== root) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const ext = segments.at(-1)?.split(".").pop()?.toLowerCase() ?? "";
  if (!MIME[ext]) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const buffer = await readFile(filePath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": MIME[ext],
        "Cache-Control": "public, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
