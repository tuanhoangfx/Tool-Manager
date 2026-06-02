/** Tool Hub (P0004) — workspace identity & user directory. */

export const HUB_DEV_ORIGIN = "http://127.0.0.1:5176";
export const HUB_PRODUCTION_ORIGIN = "https://infix1.io.vn";

export function resolveToolHubOrigin(): string {
  const fromEnv = import.meta.env.VITE_TOOL_HUB_URL as string | undefined;
  if (fromEnv?.trim()) return fromEnv.trim().replace(/\/$/, "");

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "databox.infix1.io.vn" || host.endsWith(".databox.infix1.io.vn")) {
      return HUB_PRODUCTION_ORIGIN;
    }
  }

  return import.meta.env.DEV ? HUB_DEV_ORIGIN : HUB_PRODUCTION_ORIGIN;
}

export function toolHubUsersUrl(): string {
  return `${resolveToolHubOrigin()}/users`;
}

export function toolHubSignInUrl(returnTo?: string): string {
  const base = toolHubUsersUrl();
  if (!returnTo?.trim()) return base;
  const url = new URL(base);
  url.searchParams.set("returnTo", returnTo.trim());
  return url.toString();
}

export function isToolHubOrigin(origin: string): boolean {
  if (origin === HUB_DEV_ORIGIN || origin === HUB_PRODUCTION_ORIGIN) return true;
  try {
    const host = new URL(origin).hostname;
    return host === "infix1.io.vn" || host.endsWith(".infix1.io.vn") || host.endsWith(".vercel.app");
  } catch {
    return false;
  }
}
