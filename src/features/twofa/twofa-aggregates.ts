import { Fingerprint, KeyRound, LockKeyhole, Shield, Timer } from "lucide-react";
import { chartBreakdownFromLabels, chartBreakdownFromPicker, type ChartRow } from "@tool-workspace/hub-ui";
import type { KpiTileData } from "../../components/sales-shell";
import { resolveChartLegendIcon } from "../../lib/badge-registry";
import { resolveTwofaPlatformIcon } from "./twofa-platform-icon";
import type { TwofaAccount } from "./types";

const iconFor = resolveChartLegendIcon;
const WEEK_MS = 7 * 86400000;

type UsageBucket = "Used (7d)" | "Never used" | "Older use";
type IdentityBucket = "Email address" | "Username / ID" | "Missing / generic";

const GENERIC_ACCOUNT = new Set(["account", "n/a", "na", "-", "—"]);

export function twofaAccountIdentityBucket(account: string): IdentityBucket {
  const value = account.trim();
  if (!value || GENERIC_ACCOUNT.has(value.toLowerCase())) return "Missing / generic";
  if (value.includes("@")) return "Email address";
  return "Username / ID";
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

function serviceRow(service: string, value: number): ChartRow {
  const label = service.trim() || "Other";
  const brand = resolveTwofaPlatformIcon(label);
  return {
    label,
    value,
    iconSrc: brand?.src,
    iconMeta: brand ? undefined : iconFor(label),
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
  const serviceCounts = new Map<string, number>();
  for (const row of accounts) {
    const label = row.service.trim() || "Other";
    serviceCounts.set(label, (serviceCounts.get(label) ?? 0) + 1);
  }
  const serviceItems: ChartRow[] = [...serviceCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => serviceRow(label, value));

  const usageItems = chartBreakdownFromLabels(
    accounts.map((row) => usageBucket(row, now)),
    { iconFor },
  );

  const passwordItems = chartBreakdownFromLabels(
    accounts.map((row) => (row.password?.trim() ? "With password" : "No password")),
    { iconFor },
  );

  const identityItems = chartBreakdownFromLabels(
    accounts.map((row) => twofaAccountIdentityBucket(row.account)),
    { iconFor },
  );

  return { serviceItems, usageItems, passwordItems, identityItems };
}
