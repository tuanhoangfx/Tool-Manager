import { KeyRound, LockKeyhole, Shield, Timer } from "lucide-react";
import { prepareChartItems } from "@tool-workspace/hub-ui";
import type { BarItem, DonutItem, KpiTileData } from "../../components/sales-shell";
import type { TwofaAccount } from "./types";

const WEEK_MS = 7 * 86400000;

function countBy(items: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) {
    out[item] = (out[item] ?? 0) + 1;
  }
  return out;
}

function usageBucket(row: TwofaAccount, now: number): "Used (7d)" | "Never used" | "Older use" {
  if (!row.lastUsedAt?.trim()) return "Never used";
  const at = new Date(row.lastUsedAt).getTime();
  if (!Number.isFinite(at)) return "Never used";
  return now - at <= WEEK_MS ? "Used (7d)" : "Older use";
}

export function twofaUsedWithin7d(accounts: TwofaAccount[], now = Date.now()): number {
  return accounts.filter((row) => usageBucket(row, now) === "Used (7d)").length;
}

export function buildTwofaKpis(
  accounts: TwofaAccount[],
  shown: TwofaAccount[],
  visibleKeys: Set<string>,
): KpiTileData[] {
  const all: KpiTileData[] = [
    {
      prefKey: "accounts_total",
      label: "Total accounts",
      value: accounts.length,
      icon: Shield,
      tone: "amber",
    },
    {
      prefKey: "accounts_shown",
      label: "Accounts (shown)",
      value: shown.length,
      hint: `${accounts.length} total`,
      icon: KeyRound,
      tone: "indigo",
    },
    {
      prefKey: "with_password",
      label: "With password",
      value: accounts.filter((row) => Boolean(row.password?.trim())).length,
      icon: LockKeyhole,
      tone: "emerald",
    },
    {
      prefKey: "used_7d",
      label: "Used (7d)",
      value: twofaUsedWithin7d(accounts),
      icon: Timer,
      tone: "blue",
    },
  ];
  return all.filter((item) => item.prefKey && visibleKeys.has(item.prefKey));
}

export function buildTwofaChartItems(accounts: TwofaAccount[]) {
  const now = Date.now();
  const serviceCounts = countBy(accounts.map((row) => row.service.trim() || "Other"));
  const serviceItems: BarItem[] = prepareChartItems(
    Object.entries(serviceCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], index) => ({
        label,
        value,
        color: ["#f59e0b", "#818cf8", "#22c55e", "#06b6d4", "#f43f5e", "#a78bfa", "#64748b", "#eab308"][index % 8],
      })),
  );
  const usageCounts = countBy(accounts.map((row) => usageBucket(row, now)));
  const usageItems: DonutItem[] = prepareChartItems(
    Object.entries(usageCounts).map(([label, value], index) => ({
      label,
      value,
      color: ["#22c55e", "#64748b", "#f59e0b"][index % 3],
    })),
  );
  return { serviceItems, usageItems };
}
