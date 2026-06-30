import type { QuotaSnapshot } from "./quota-types";

export function primaryQuotaPercent(snapshot?: QuotaSnapshot | null): number | null {
  if (!snapshot?.metrics?.length) return null;
  const pct = snapshot.metrics.find((m) => m.unit === "%" && typeof m.used === "number");
  return pct?.used ?? null;
}

export function formatQuotaSummary(snapshot?: QuotaSnapshot | null): string {
  if (!snapshot) return "—";
  if (snapshot.error) return snapshot.error;
  if (!snapshot.metrics.length) return "No metrics";
  return snapshot.metrics
    .slice(0, 3)
    .map((m) => {
      if (m.unit === "%" && m.used != null) return `${m.label} ${m.used}%`;
      if (m.used != null && m.unit) return `${m.label} ${m.used} ${m.unit}`;
      return m.label;
    })
    .join(" · ");
}

export function formatPlanExpiry(iso?: string): { label: string; tone: "ok" | "warn" | "danger" | "muted" } {
  if (!iso) return { label: "—", tone: "muted" };
  const expires = Date.parse(iso);
  if (Number.isNaN(expires)) return { label: iso, tone: "muted" };
  const days = Math.ceil((expires - Date.now()) / 86_400_000);
  const dateLabel = new Date(expires).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  if (days < 0) return { label: `${dateLabel} (expired)`, tone: "danger" };
  if (days <= 7) return { label: `${dateLabel} (${days}d)`, tone: "warn" };
  return { label: dateLabel, tone: "ok" };
}

export function quotaStatusLabel(status?: string): string {
  switch (status) {
    case "ok":
      return "Live";
    case "error":
      return "Probe error";
    case "no_credential":
      return "No token";
    case "unsupported":
      return "Unsupported";
    case "stale":
      return "Stale";
    default:
      return status?.trim() || "Not checked";
  }
}
