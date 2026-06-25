import registry from "./twofa-platform-icons.registry.json";

const THESVG_CDN = "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons";

type IconSource =
  | { type: "local"; src: string }
  | { type: "thesvg"; slug: string };

/** See `twofa-platform-icons.README.md` — bare | tile | darkInk */
export type TwofaIconShell = "bare" | "tile" | "darkInk";

type PlatformIconEntry = {
  label: string;
  match: string;
  source: IconSource;
  /** Display shell override — default inferred from asset path. */
  shell?: TwofaIconShell;
  /** @deprecated Prefer `"shell": "darkInk"`. */
  darkInk?: boolean;
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
  shell: TwofaIconShell;
};

function iconSrc(source: IconSource): string {
  return source.type === "local" ? source.src : `${THESVG_CDN}/${source.slug}/default.svg`;
}

function resolveIconShell(entry: PlatformIconEntry, src: string): TwofaIconShell {
  if (entry.shell) return entry.shell;
  if (entry.darkInk) return "darkInk";
  if (src.includes("/assets/brand-icons/") && (src.endsWith(".png") || src.endsWith(".ico"))) return "bare";
  if (src.includes("/icons/github.svg")) return "tile";
  if (src.includes("/icons/vercel.svg")) return "darkInk";
  return "bare";
}

/** Resolve brand icon for 2FA service/platform name (e.g. Gmail → Google). */
export function resolveTwofaPlatformIcon(service: string): TwofaPlatformIcon | null {
  const key = service.trim().toLowerCase();
  if (!key) return null;
  const cached = iconCache.get(key);
  if (cached !== undefined) return cached;
  const hit = MATCHERS.find((item) => item.re.test(key))?.entry;
  if (!hit) {
    iconCache.set(key, null);
    return null;
  }
  const src = iconSrc(hit.source);
  const resolved: TwofaPlatformIcon = {
    label: hit.label,
    src,
    shell: resolveIconShell(hit, src),
  };
  iconCache.set(key, resolved);
  return resolved;
}

/** @internal test helper */
export function clearTwofaPlatformIconCache(): void {
  iconCache.clear();
}
