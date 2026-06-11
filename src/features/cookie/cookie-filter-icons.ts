import { patchHubListPrefs } from "../../lib/url-prefs";

/** Drop legacy filter keys removed from Cookie Auto (Type / Source). */

export function stripLegacyCookieFilterKeys(keys: Set<string> | null): Set<string> | null {
  if (!keys?.size) return keys;
  if (!keys.has("type") && !keys.has("source")) return keys;
  const next = new Set([...keys].filter((key) => key !== "type" && key !== "source"));
  return next.size ? next : null;
}

export function stripLegacyCookieFilterValues<T extends Record<string, string[] | undefined>>(values: T): T {
  if (!values.type && !values.source) return values;
  const next = { ...values };
  delete next.type;
  delete next.source;
  return next;
}

export function sanitizeCookieFilterUrl() {
  if (typeof window === "undefined") return;
  const sp = new URLSearchParams(window.location.search);
  const raw = sp.get("cfilt");
  if (!raw) return;
  const keys = raw.split(",").filter((key) => key && key !== "type" && key !== "source");
  if (keys.join(",") === raw) return;
  patchHubListPrefs({ cfilt: keys.length ? keys.join(",") : null });
}
