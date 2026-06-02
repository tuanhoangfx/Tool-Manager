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

export function resolveCookieSiteIcon(domain: string): CookieSiteIcon | null {
  const host = domain.replace(/^\./, "").toLowerCase();
  const hit = REGISTRY.find((item) => new RegExp(item.match, "i").test(host));
  if (!hit) return null;
  const src = hit.source.type === "thesvg" ? `${THESVG_CDN}/${hit.source.slug}/default.svg` : hit.source.webSrc;
  return { label: hit.label, src };
}
