import brandIconRegistry from "./cookieBrandIcons.registry.json";

const THESVG_CDN = "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons";

type CookieBrandIconEntry = {
  label: string;
  match: string;
  source: { type: "thesvg"; slug: string } | { type: "local"; webSrc: string; extensionSrc: string };
};

const REGISTRY = brandIconRegistry as CookieBrandIconEntry[];

export type CookieSiteIcon = {
  label: string;
  src: string;
};

function iconSrcForEntry(hit: CookieBrandIconEntry): string {
  return hit.source.type === "thesvg" ? `${THESVG_CDN}/${hit.source.slug}/default.svg` : hit.source.webSrc;
}

export function resolveCookieSiteIcon(domain: string): CookieSiteIcon | null {
  const host = domain.replace(/^\./, "").toLowerCase();
  const hit = REGISTRY.find((item) => new RegExp(item.match, "i").test(host));
  if (!hit) return null;
  return { label: hit.label, src: iconSrcForEntry(hit) };
}

/** Resolve brand icon for chart legend / filter by platform label (e.g. Cursor → cursor.png). */
export function resolveCookiePlatformIconByLabel(label: string): CookieSiteIcon | null {
  const key = label.trim();
  if (!key || key === "Others" || key === "Other") return null;
  const hit = REGISTRY.find((item) => item.label === key);
  if (!hit) return null;
  return { label: hit.label, src: iconSrcForEntry(hit) };
}
