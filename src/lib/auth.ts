import { cookies } from "next/headers";
import { timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import {
  ADMIN_COOKIE,
  SESSION_TTL_MS,
  buildSessionToken,
  getSessionSecret,
  verifySessionToken,
} from "@/lib/auth-session";

function getAdminPassword(): string | undefined {
  const password = process.env.ADMIN_PASSWORD?.trim();
  if (password) return password;
  if (process.env.NODE_ENV === "production") return undefined;
  return "zella2026";
}

function safeEqualString(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    const padded = Buffer.alloc(aBuf.length);
    bBuf.copy(padded, 0, 0, Math.min(bBuf.length, padded.length));
    timingSafeEqual(aBuf, padded);
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const adminPassword = getAdminPassword();
  if (!adminPassword || !password) return false;

  if (adminPassword.startsWith("$2a$") || adminPassword.startsWith("$2b$") || adminPassword.startsWith("$2y$")) {
    try {
      return await bcrypt.compare(password, adminPassword);
    } catch {
      return false;
    }
  }

  return safeEqualString(password, adminPassword);
}

export async function createAdminSession(): Promise<boolean> {
  const token = await buildSessionToken();
  if (!token) return false;

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
    path: "/",
  });
  return true;
}

export async function destroyAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
}

export async function isAdminAuthenticated(): Promise<boolean> {
  if (!getSessionSecret()) return false;
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  return verifySessionToken(token);
}

export { ADMIN_COOKIE, verifySessionToken, getSessionSecret };
