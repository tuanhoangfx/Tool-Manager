export function readShareTokenFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("token");
}

export function generateShareToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

export async function hashSharePassword(password: string, noteId: string): Promise<string> {
  const data = new TextEncoder().encode(`${noteId}:${password.trim()}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function buildShareUrl(token: string): string {
  const base = typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";
  return `${base}?screen=share&token=${token}`;
}
