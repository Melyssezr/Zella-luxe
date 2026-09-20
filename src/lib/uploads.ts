import path from "path";

/** True on Vercel (serverless — no persistent local disk). */
export function isVercel(): boolean {
  return Boolean(process.env.VERCEL);
}

/** Vercel serverless has no persistent disk — dynamic uploads need R2 (or legacy Cloudinary). */
export function requiresRemoteUploads(): boolean {
  return isVercel();
}

/** @deprecated use requiresRemoteUploads */
export function requiresCloudinaryUploads(): boolean {
  return requiresRemoteUploads();
}

export function getUploadRoot(): string {
  if (requiresRemoteUploads()) {
    throw new Error("Local uploads are disabled in production; configure Cloudflare R2.");
  }
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
}

export function getUploadDir(subdir: string): string {
  return path.join(getUploadRoot(), subdir);
}

export function getUploadPublicUrl(subdir: string, filename: string): string {
  if (process.env.UPLOAD_DIR) {
    return `/api/uploads/${subdir}/${filename}`;
  }
  return `/uploads/${subdir}/${filename}`;
}
