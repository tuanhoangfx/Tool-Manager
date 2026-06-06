import { Fingerprint, KeyRound, LockKeyhole, Shield, Timer } from "lucide-react";
import { prepareChartItems } from "@tool-workspace/hub-ui";
import { resolveChartLegendIcon } from "../../lib/badge-registry";
import type { BarItem, KpiTileData } from "../../components/sales-shell";
import { resolveTwofaPlatformIcon } from "./twofa-platform-icon";
import type { TwofaAccount } from "./types";

const WEEK_MS = 7 * 86400000;
const SERVICE_COLORS = ["#f59e0b", "#818cf8", "#22c55e", "#06b6d4", "#f43f5e", "#a78bfa", "#64748b", "#eab308"];

type UsageBucket = "Used (7d)" | "Never used" | "Older use";
type IdentityBucket = "Email address" | "Username / ID" | "Missing / generic";

const GENERIC_ACCOUNT = new Set(["account", "n/a", "na", "-", "—"]);

export function twofaAccountIdentityBucket(account: string): IdentityBucket {
  const value = account.trim();
  if (!value || GENERIC_ACCOUNT.has(value.toLowerCase())) return "Missing / generic";
  if (value.includes("@")) return "Email address";
  return "Username / ID";
}

function countBy(items: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) {
    out[item] = (out[item] ?? 0) + 1;
  }
  return out;
}

function usageBucket(row: TwofaAccount, now: number): UsageBucket {
  if (!row.lastUsedAt?.trim()) return "Never used";
  const at = new Date(row.lastUsedAt).getTime();
  if (!Number.isFinite(at)) return "Never used";
  return now - at <= WEEK_MS ? "Used (7d)" : "Older use";
}

export function twofaUsedWithin7d(accounts: TwofaAccount[], now = Date.now()): number {
  return accounts.filter((row) => usageBucket(row, now) === "Used (7d)").length;
}

export function twofaIdentifiedCount(accounts: TwofaAccount[]): number {
  return accounts.filter((row) => twofaAccountIdentityBucket(row.account) !== "Missing / generic").length;
}

function serviceBarRow(service: string, value: number, color: string): BarItem {
  const label = service.trim() || "Other";
  const brand = resolveTwofaPlatformIcon(label);
  return {
    label,
    value,
    color,
    iconSrc: brand?.src,
    iconMeta: brand ? undefined : resolveChartLegendIcon(label),
  };
}

export function buildTwofaKpis(
  accounts: TwofaAccount[],
  shown: TwofaAccount[],
  visibleKeys: Set<string>,
): KpiTileData[] {
  const now = Date.now();
  const withPasswordTotal = accounts.filter((row) => Boolean(row.password?.trim())).length;
  const withPasswordShown = shown.filter((row) => Boolean(row.password?.trim())).length;
  const used7dTotal = twofaUsedWithin7d(accounts, now);
  const used7dShown = twofaUsedWithin7d(shown, now);
  const identifiedTotal = twofaIdentifiedCount(accounts);
  const identifiedShown = twofaIdentifiedCount(shown);

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
      hint: shown.length < accounts.length ? `${accounts.length} total` : undefined,
      icon: KeyRound,
      tone: "indigo",
    },
    {
      prefKey: "identified_accounts",
      label: "Identified accounts",
      value: identifiedShown,
      hint: identifiedShown < identifiedTotal ? `${identifiedTotal} total` : undefined,
      icon: Fingerprint,
      tone: "blue",
    },
    {
      prefKey: "with_password",
      label: "With password",
      value: withPasswordShown,
      hint: withPasswordShown < withPasswordTotal ? `${withPasswordTotal} total` : undefined,
      icon: LockKeyhole,
      tone: "emerald",
    },
    {
      prefKey: "used_7d",
      label: "Used (7d)",
      value: used7dShown,
      hint: used7dShown < used7dTotal ? `${used7dTotal} total` : undefined,
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
      .map(([label, value], index) => serviceBarRow(label, value, SERVICE_COLORS[index % SERVICE_COLORS.length]!)),
  );

  const usageOrder: UsageBucket[] = ["Used (7d)", "Older use", "Never used"];
  const usageCounts = countBy(accounts.map((row) => usageBucket(row, now)));
  const usageColors: Record<UsageBucket, string> = {
    "Used (7d)": "#22c55e",
    "Older use": "#f59e0b",
    "Never used": "#64748b",
  };
  const usageItems: BarItem[] = prepareChartItems(
    usageOrder
      .map((label) => ({
        label,
        value: usageCounts[label] ?? 0,
        color: usageColors[label],
        iconMeta: resolveChartLegendIcon(label),
      }))
      .filter((row) => row.value > 0),
  );

  const withPassword = accounts.filter((row) => Boolean(row.password?.trim())).length;
  const noPassword = accounts.length - withPassword;
  const passwordItems: BarItem[] = prepareChartItems(
    [
      {
        label: "With password",
        value: withPassword,
        color: "#22c55e",
        iconMeta: resolveChartLegendIcon("With password"),
      },
      {
        label: "No password",
        value: noPassword,
        color: "#64748b",
        iconMeta: resolveChartLegendIcon("No password"),
      },
    ].filter((row) => row.value > 0),
  );

  const identityOrder: IdentityBucket[] = ["Email address", "Username / ID", "Missing / generic"];
  const identityCounts = countBy(accounts.map((row) => twofaAccountIdentityBucket(row.account)));
  const identityColors: Record<IdentityBucket, string> = {
    "Email address": "#06b6d4",
    "Username / ID": "#818cf8",
    "Missing / generic": "#64748b",
  };
  const identityItems: BarItem[] = prepareChartItems(
    identityOrder
      .map((label) => ({
        label,
        value: identityCounts[label] ?? 0,
        color: identityColors[label],
        iconMeta: resolveChartLegendIcon(label),
      }))
      .filter((row) => row.value > 0),
  );

  return { serviceItems, usageItems, passwordItems, identityItems };
}
