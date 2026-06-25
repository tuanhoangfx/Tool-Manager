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

const MATCHERS = ENTRIES.map((entry) => ({
  entry,
  re: new RegExp(entry.match, "i"),
}));

const iconCache = new Map<string, TwofaPlatformIcon | null>();

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
  const cached = iconCache.get(key);
  if (cached !== undefined) return cached;
  const hit = MATCHERS.find((item) => item.re.test(key))?.entry;
  const resolved = hit ? { label: hit.label, src: iconSrc(hit.source) } : null;
  iconCache.set(key, resolved);
  return resolved;
}

/** @internal test helper */
export function clearTwofaPlatformIconCache(): void {
  iconCache.clear();
}
