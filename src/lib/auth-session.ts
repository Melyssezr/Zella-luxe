export const ADMIN_COOKIE = "zella_admin_session";
/** 12 hours — shorter sessions reduce stolen-cookie risk. */
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (secret && secret.length >= 32) return secret;

  // Prefer a dedicated ADMIN_SESSION_SECRET. Fallback keeps existing deploys
  // working but is weaker than a random independent secret.
  const password = process.env.ADMIN_PASSWORD?.trim();
  if (password && password.length >= 8) {
    return `zl.sess.v1.${password}`.slice(0, 96).padEnd(32, "0");
  }

  if (process.env.NODE_ENV === "production") return "";
  return "zella-dev-session-secret-local-only-min-32";
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function signPayload(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return toHex(signature);
}

function randomNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toHex(bytes.buffer);
}

/** Edge + Node compatible session verification (Web Crypto). */
export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const secret = getSessionSecret();
  if (!secret) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [expiresAtRaw, nonce, signature] = parts;
  if (!expiresAtRaw || !nonce || !signature) return false;
  if (!/^\d+$/.test(expiresAtRaw) || nonce.length < 16 || nonce.length > 64) return false;
  if (!/^[a-f0-9]+$/i.test(signature)) return false;

  const payload = `${expiresAtRaw}.${nonce}`;
  const expected = await signPayload(payload, secret);
  if (!timingSafeEqualHex(signature.toLowerCase(), expected.toLowerCase())) return false;

  const expiresAt = Number.parseInt(expiresAtRaw, 10);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;
  return true;
}

export async function buildSessionToken(): Promise<string | null> {
  const secret = getSessionSecret();
  if (!secret) return null;

  const expiresAt = Date.now() + SESSION_TTL_MS;
  const nonce = randomNonce();
  const payload = `${expiresAt}.${nonce}`;
  const signature = await signPayload(payload, secret);
  return `${payload}.${signature}`;
}
