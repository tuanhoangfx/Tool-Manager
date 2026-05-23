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

export function broadcastExtensionAuth(session: {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
}) {
  const supabase_url = import.meta.env.VITE_SUPABASE_URL as string;
  const supabase_anon_key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const detail = {
    type: "P0020_COOKIE_BRIDGE_AUTH",
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    supabase_url,
    supabase_anon_key,
  };
  window.postMessage(detail, window.location.origin);
  document.dispatchEvent(new CustomEvent("p0020-bridge-auth", { detail }));
}
