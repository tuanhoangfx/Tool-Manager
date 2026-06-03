/** Canonical P0020-Data-Box URLs (production + local). */

export const APP_PRODUCTION_ORIGIN = "https://databox.infi.io.vn";
export const APP_LOCAL_ORIGIN = "http://127.0.0.1:5177";
export const APP_LEGACY_ORIGIN = "https://tool-manager-zeta.vercel.app";

export const APP_ORIGIN =
  typeof import.meta.env.VITE_APP_ORIGIN === "string" && import.meta.env.VITE_APP_ORIGIN.trim()
    ? import.meta.env.VITE_APP_ORIGIN.trim().replace(/\/$/, "")
    : import.meta.env.PROD
      ? APP_PRODUCTION_ORIGIN
      : APP_LOCAL_ORIGIN;

export const COOKIE_PATH = "/cookie";

export function cookieScreenUrl(origin = APP_ORIGIN): string {
  return `${origin.replace(/\/$/, "")}${COOKIE_PATH}`;
}

export function isDataBoxHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "databox.infi.io.vn" || host.endsWith(".databox.infi.io.vn");
}
