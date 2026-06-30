import {
  resolveHubBrandIconByMatch,
  type HubBrandIconShell,
} from "@tool-workspace/hub-ui";

/** @deprecated Use `HubBrandIconShell` from hub-ui. */
export type TwofaIconShell = HubBrandIconShell;

export type TwofaPlatformIcon = {
  label: string;
  src: string;
  shell: TwofaIconShell;
};

/** Resolve brand icon for 2FA service/platform name — delegates to hub-ui SSOT. */
export function resolveTwofaPlatformIcon(service: string): TwofaPlatformIcon | null {
  const hit = resolveHubBrandIconByMatch(service);
  if (!hit) return null;
  return { label: hit.label, src: hit.src, shell: hit.shell };
}

/** @internal test helper */
export function clearTwofaPlatformIconCache(): void {
  // Match cache lives in hub-ui — tests import clearHubBrandIconMatchCache when needed.
}
