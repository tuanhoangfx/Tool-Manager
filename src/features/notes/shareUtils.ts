import { APP_PRODUCTION_ORIGIN } from "../../lib/app-urls";

export const PUBLIC_SHARE_PATH = "/share";

export function readShareTokenFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const token = new URLSearchParams(window.location.search).get("token")?.trim();
  return token || null;
}

function parseSearchParams(search?: string): URLSearchParams {
  const raw =
    search ?? (typeof window !== "undefined" ? window.location.search : "");
  return new URLSearchParams(raw.startsWith("?") ? raw.slice(1) : raw);
}

function normalizePath(pathname?: string): string {
  const raw =
    pathname ?? (typeof window !== "undefined" ? window.location.pathname : "/");
  return raw.replace(/\/+$/, "") || "/";
}

/**
 * Public share entry — token in URL, not an owner note deep-link (`?note=`).
 * Matches `/share?token=`, legacy `/notes?token=`, `/?screen=share&token=`.
 */
export function isPublicShareEntry(pathname?: string, search?: string): boolean {
  const path = normalizePath(pathname);
  const p = parseSearchParams(search);
  const token = p.get("token")?.trim();
  if (!token) return false;
  if (p.get("note")?.trim()) return false;

  if (path === PUBLIC_SHARE_PATH) return true;
  if (p.get("screen") === "share") return true;
  if (path === "/notes" || path === "/") return true;
  return false;
}

/** @deprecated Use isPublicShareEntry */
export function isPublicShareLinkSearch(search?: string): boolean {
  return isPublicShareEntry(undefined, search);
}

export function canonicalPublicSharePath(token: string): string {
  return `${PUBLIC_SHARE_PATH}?token=${encodeURIComponent(token)}`;
}

/** Normalize legacy URLs (`/notes?token=`, `/?screen=share&token=`) → `/share?token=`. */
export function migratePublicShareUrl(): boolean {
  if (typeof window === "undefined") return false;
  if (!isPublicShareEntry()) return false;
  const token = readShareTokenFromUrl();
  if (!token) return false;
  const target = canonicalPublicSharePath(token);
  const current = `${window.location.pathname}${window.location.search}`;
  if (current !== target) {
    window.history.replaceState(null, "", target);
  }
  return true;
}

export function generateShareToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

export async function hashSharePassword(password: string, noteId: string): Promise<string> {
  const data = new TextEncoder().encode(`${noteId}:${password.trim()}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Public share URL — production host, dedicated `/share` path (no Notes tab / login). */
export function buildShareUrl(token: string): string {
  const base = APP_PRODUCTION_ORIGIN.replace(/\/$/, "");
  return `${base}${PUBLIC_SHARE_PATH}?token=${encodeURIComponent(token)}`;
}
