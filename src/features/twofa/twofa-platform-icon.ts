import registry from "./twofa-platform-icons.registry.json";

const THESVG_CDN = "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons";

type IconSource =
  | { type: "local"; src: string }
  | { type: "thesvg"; slug: string };

type PlatformIconEntry = {
  label: string;
  match: string;
  source: IconSource;
};

const ENTRIES = registry as PlatformIconEntry[];

export type TwofaPlatformIcon = {
  label: string;
  src: string;
};

function iconSrc(source: IconSource): string {
  return source.type === "local" ? source.src : `${THESVG_CDN}/${source.slug}/default.svg`;
}

/** Resolve brand icon for 2FA service/platform name (e.g. Gmail → Google). */
export function resolveTwofaPlatformIcon(service: string): TwofaPlatformIcon | null {
  const key = service.trim().toLowerCase();
  if (!key) return null;
  const hit = ENTRIES.find((item) => new RegExp(item.match, "i").test(key));
  if (!hit) return null;
  return { label: hit.label, src: iconSrc(hit.source) };
}
