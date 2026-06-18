import type { CookieBinding } from "./cookieBridge";
import { RouteShareChip, RouteSyncChip, RouteVaultChip } from "./cookieRouteStatChips";
import { useCookieRouteShareCount } from "./useCookieRouteShareCount";

export type CookieRouteChipRowProps = {
  binding: CookieBinding;
  syncStatus?: string | null;
  noteSyncedAt?: string | null;
  vaultCookieCount?: number | null;
  /** When set, skips per-chip members RPC (directory supplies batch counts). */
  shareCount?: number;
};

/** Route stat chips — Sync / Vault / Share (Publish removed). Card, About, and table parity. */
export function CookieRouteChipRow({
  binding,
  syncStatus = "pending",
  noteSyncedAt,
  vaultCookieCount,
  shareCount: shareCountProp,
}: CookieRouteChipRowProps) {
  const fetchedCount = useCookieRouteShareCount(binding.noteId, {
    prefetch: shareCountProp === undefined,
  });
  const shareCount = shareCountProp ?? fetchedCount;

  return (
    <div className="flex min-h-[var(--hub-card-chip-row-min-h)] flex-wrap items-center gap-1.5">
      <RouteSyncChip
        status={syncStatus ?? "pending"}
        noteSyncedAt={noteSyncedAt}
        vaultCookieCount={vaultCookieCount}
      />
      <RouteVaultChip cookieCount={vaultCookieCount} />
      <RouteShareChip binding={binding} shareCount={shareCount} />
    </div>
  );
}
