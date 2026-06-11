import { chartBreakdownFromPicker, type ChartRow } from "@tool-workspace/hub-ui";
import { resolveChartLegendIcon } from "../../lib/badge-registry";
import { resolveCookiePlatformIconByLabel, resolveCookieSiteIcon } from "./cookieSiteIcon";
import type { CookieRouteRow } from "./cookie-route-filter-counts";
import { resolveRouteFilterStatus } from "./route-sync-display";
import { lookupVaultRow, type CookieVaultRow } from "./useCookieVaultMap";

const iconFor = resolveChartLegendIcon;

const STATUS_ORDER = ["synced", "pending", "error", "manual"] as const;

const STATUS_LABEL: Record<(typeof STATUS_ORDER)[number], string> = {
  synced: "Synced",
  pending: "Awaiting sync",
  error: "Error",
  manual: "Manual",
};

function platformLabel(domain: string): string {
  return resolveCookieSiteIcon(domain)?.label ?? "Others";
}

function platformRow(label: string, value: number): ChartRow {
  const brand = resolveCookiePlatformIconByLabel(label);
  return {
    label,
    value,
    iconSrc: brand?.src,
    iconMeta: brand ? undefined : iconFor(label),
  };
}

function shareLabel(row: CookieRouteRow, shareCounts: Record<string, number>): string {
  if (row.binding.accessRole === "member") return "Shared to me";
  const members = shareCounts[row.binding.noteId] ?? 0;
  return members > 0 ? "Shared" : "Private";
}

export function buildCookieChartItems(
  rows: CookieRouteRow[],
  vaultByKey: Record<string, CookieVaultRow>,
  shareCounts: Record<string, number> = {},
) {
  const statusItems = chartBreakdownFromPicker(
    rows,
    (row) => {
      const vault = lookupVaultRow(vaultByKey, row.binding.noteId, row.binding.domain);
      const key = resolveRouteFilterStatus({
        syncStatus: row.note?.sync_status,
        noteSyncedAt: row.note?.synced_at,
        vaultCookieCount: vault?.cookie_count,
      });
      return STATUS_LABEL[key as (typeof STATUS_ORDER)[number]] ?? key;
    },
    { iconFor },
  );

  const platformCounts = new Map<string, number>();
  for (const row of rows) {
    const label = platformLabel(row.binding.domain);
    platformCounts.set(label, (platformCounts.get(label) ?? 0) + 1);
  }
  const platformItems: ChartRow[] = [...platformCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => platformRow(label, value));

  const shareItems = chartBreakdownFromPicker(rows, (row) => shareLabel(row, shareCounts), { iconFor });

  return { statusItems, platformItems, shareItems };
}
