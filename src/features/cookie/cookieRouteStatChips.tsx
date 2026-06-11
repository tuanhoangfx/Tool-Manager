import type { ElementType } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Cookie,
  Database,
  Lock,
  Share2,
  UserRound,
  Users,
} from "lucide-react";
import type { CookieBinding } from "./cookieBridge";
import { resolveRouteSyncDisplay } from "./route-sync-display";

export type RouteStatChipTone = "ok" | "warn" | "neutral" | "info" | "share";

export function RouteStatChip({
  icon: Icon,
  label,
  tone = "neutral",
}: {
  icon: ElementType;
  label: string;
  tone?: RouteStatChipTone;
}) {
  return (
    <span className={`cookie-route-chip cookie-route-chip--${tone}`}>
      <Icon size={11} strokeWidth={2.25} aria-hidden />
      <span>{label}</span>
    </span>
  );
}

export function RouteSyncChip({
  status,
  noteSyncedAt,
  vaultCookieCount,
}: {
  status: string;
  noteSyncedAt?: string | null;
  vaultCookieCount?: number | null;
}) {
  const display = resolveRouteSyncDisplay({
    syncStatus: status,
    noteSyncedAt,
    vaultCookieCount,
  });
  const Icon = display.tone === "ok" ? CheckCircle2 : display.label === "Error" ? AlertCircle : Clock;
  return (
    <span title={display.title}>
      <RouteStatChip icon={Icon} label={display.label} tone={display.tone} />
    </span>
  );
}

export function RouteVaultChip({ cookieCount }: { cookieCount: number | null | undefined }) {
  if (cookieCount == null || cookieCount < 0) {
    return <RouteStatChip icon={Database} label="No vault" tone="warn" />;
  }
  return (
    <RouteStatChip
      icon={Cookie}
      label={`${cookieCount} cookie${cookieCount === 1 ? "" : "s"}`}
      tone="info"
    />
  );
}

export function RouteShareChip({
  binding,
  shareCount,
}: {
  binding: CookieBinding;
  shareCount?: number;
}) {
  if (binding.accessRole === "member") {
    return <RouteStatChip icon={Share2} label="Shared to me" tone="share" />;
  }
  if (shareCount === undefined) {
    return <RouteStatChip icon={Users} label="Share…" tone="neutral" />;
  }
  if (shareCount > 0) {
    return <RouteStatChip icon={Users} label={`Shared ${shareCount}`} tone="share" />;
  }
  return <RouteStatChip icon={UserRound} label="Private" tone="neutral" />;
}

export function RouteLockChip({ locked }: { locked: boolean }) {
  return (
    <RouteStatChip icon={Lock} label={locked ? "Locked" : "Owner"} tone={locked ? "ok" : "neutral"} />
  );
}
