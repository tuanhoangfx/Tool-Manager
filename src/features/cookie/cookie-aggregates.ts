import { CHART_OTHERS_LABEL } from "@tool-workspace/hub-ui";
import type { BarItem } from "../../components/sales-shell";
import { resolveChartLegendIcon } from "../../lib/badge-registry";
import { resolveCookiePlatformIconByLabel, resolveCookieSiteIcon } from "./cookieSiteIcon";
import type { CookieRouteRow } from "./cookie-route-filter-counts";
import { resolveRouteFilterStatus } from "./route-sync-display";
import { lookupVaultRow, type CookieVaultRow } from "./useCookieVaultMap";

const STATUS_ORDER = ["synced", "pending", "error", "manual"] as const;

const STATUS_LABEL: Record<(typeof STATUS_ORDER)[number], string> = {
  synced: "Synced",
  pending: "Awaiting sync",
  error: "Error",
  manual: "Manual",
};

const STATUS_COLOR: Record<(typeof STATUS_ORDER)[number], string> = {
  synced: "#22c55e",
  pending: "#f59e0b",
  error: "#f43f5e",
  manual: "#94a3b8",
};

const PLATFORM_COLORS = ["#818cf8", "#06b6d4", "#22c55e", "#f59e0b", "#a855f7", "#ec4899", "#64748b"];

function countBy(items: string[]): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item] = (acc[item] ?? 0) + 1;
    return acc;
  }, {});
}

function platformLabel(domain: string): string {
  return resolveCookieSiteIcon(domain)?.label ?? CHART_OTHERS_LABEL;
}

function platformBarRow(label: string, value: number, color: string): BarItem {
  const brand = resolveCookiePlatformIconByLabel(label);
  return {
    label,
    value,
    color,
    iconSrc: brand?.src,
    iconMeta: brand ? undefined : resolveChartLegendIcon(label),
  };
}

export function buildCookieChartItems(
  rows: CookieRouteRow[],
  vaultByKey: Record<string, CookieVaultRow>,
  shareCounts: Record<string, number> = {},
) {
  const statusCounts = countBy(
    rows.map((row) => {
      const vault = lookupVaultRow(vaultByKey, row.binding.noteId, row.binding.domain);
      return resolveRouteFilterStatus({
        syncStatus: row.note?.sync_status,
        noteSyncedAt: row.note?.synced_at,
        vaultCookieCount: vault?.cookie_count,
      });
    }),
  );
  const statusItems: BarItem[] = STATUS_ORDER.map((key) => ({
    label: STATUS_LABEL[key],
    value: statusCounts[key] ?? 0,
    color: STATUS_COLOR[key],
  })).filter((row) => row.value > 0);

  const platformRouteCounts = countBy(rows.map((row) => platformLabel(row.binding.domain)));
  const platformItems: BarItem[] = Object.entries(platformRouteCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], index) =>
      platformBarRow(label, value, PLATFORM_COLORS[index % PLATFORM_COLORS.length]!),
    );

  let privateRoutes = 0;
  let sharedOut = 0;
  let sharedToMe = 0;
  for (const row of rows) {
    if (row.binding.accessRole === "member") {
      sharedToMe += 1;
      continue;
    }
    const members = shareCounts[row.binding.noteId] ?? 0;
    if (members > 0) sharedOut += 1;
    else privateRoutes += 1;
  }
  const shareItems: BarItem[] = [
    { label: "Private", value: privateRoutes, color: "#64748b" },
    { label: "Shared", value: sharedOut, color: "#a855f7" },
    { label: "Shared to me", value: sharedToMe, color: "#06b6d4" },
  ].filter((row) => row.value > 0);

  return { statusItems, platformItems, shareItems };
}
