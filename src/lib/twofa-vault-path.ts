/** Account Vault sub-routes under `/twofa/...`. */
export type TwofaVaultView = "services" | "mail" | "quota";

export const TWOFA_VAULT_VIEWS = ["services", "mail", "quota"] as const satisfies readonly TwofaVaultView[];

export const DEFAULT_TWOFA_VAULT_VIEW: TwofaVaultView = "services";

const VIEW_SEGMENT: Record<TwofaVaultView, string> = {
  services: "services",
  mail: "mail",
  quota: "quota",
};

const SEGMENT_VIEW: Record<string, TwofaVaultView> = {
  services: "services",
  mail: "mail",
  quota: "quota",
};

function pathSegments(pathname: string): string[] {
  return pathname.replace(/\/+$/, "").split("/").filter(Boolean);
}

export function parseTwofaVaultRoute(pathname: string): { view: TwofaVaultView } {
  const segments = pathSegments(pathname);
  if (segments[0] !== "twofa") return { view: DEFAULT_TWOFA_VAULT_VIEW };
  const seg = segments[1];
  if (!seg) return { view: DEFAULT_TWOFA_VAULT_VIEW };
  return { view: SEGMENT_VIEW[seg] ?? DEFAULT_TWOFA_VAULT_VIEW };
}

export function readTwofaVaultView(): TwofaVaultView {
  if (typeof window === "undefined") return DEFAULT_TWOFA_VAULT_VIEW;
  return parseTwofaVaultRoute(window.location.pathname).view;
}

export function buildTwofaVaultUrl(view: TwofaVaultView, search = ""): string {
  const base = `/twofa/${VIEW_SEGMENT[view]}`;
  const qs = search.startsWith("?") ? search.slice(1) : search;
  return qs ? `${base}?${qs}` : base;
}

/** `/twofa` → `/twofa/services` (canonical sub-view). */
export function migrateTwofaVaultUrl(): string | null {
  if (typeof window === "undefined") return null;
  const normalized = window.location.pathname.replace(/\/+$/, "") || "/";
  if (normalized !== "/twofa") return null;
  return buildTwofaVaultUrl(DEFAULT_TWOFA_VAULT_VIEW, window.location.search);
}

export function setTwofaVaultView(view: TwofaVaultView): void {
  if (typeof window === "undefined") return;
  const url = buildTwofaVaultUrl(view, window.location.search);
  if (`${window.location.pathname}${window.location.search}` === url) return;
  window.history.pushState(null, "", url);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function isTwofaVaultPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return normalized === "/twofa" || normalized.startsWith("/twofa/");
}
