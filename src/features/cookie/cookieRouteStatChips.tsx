import type { ElementType } from "react";
import { CheckCircle2, Clock, Cookie, Database, Lock, Share2, UserRound, Users } from "lucide-react";
import type { CookieBinding } from "./cookieBridge";

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

export function RouteSyncChip({ status }: { status: string }) {
  const synced = status === "synced";
  return (
    <RouteStatChip
      icon={synced ? CheckCircle2 : Clock}
      label={synced ? "Synced" : status}
      tone={synced ? "ok" : "warn"}
    />
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
  if (shareCount && shareCount > 0) {
    return <RouteStatChip icon={Users} label={`Shared ${shareCount}`} tone="share" />;
  }
  return <RouteStatChip icon={UserRound} label="Private" tone="neutral" />;
}

export function RouteLockChip({ locked }: { locked: boolean }) {
  return (
    <RouteStatChip icon={Lock} label={locked ? "Locked" : "Owner"} tone={locked ? "ok" : "neutral"} />
  );
}
