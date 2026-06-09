import { CloudOff, CloudUpload, GitMerge, RefreshCw, Shield } from "lucide-react";
import { HubResultCount, HubRowLimitSelect, HubTimeRangeSelect } from "../../components/sales-shell";
import type { TimeRange } from "../../lib/url-prefs";
import type { TwofaCloudSyncState } from "./twofa-cloud-sync";

type Props = {
  range: TimeRange;
  limit: number;
  /** Rows rendered in the table (after row limit). */
  tableShown: number;
  /** Rows matching search/filters. */
  filteredTotal: number;
  /** All accounts in vault. */
  total: number;
  cloudState?: TwofaCloudSyncState;
  cloudError?: string | null;
  onCloudSync?: () => void;
  onDedupe?: () => void;
};

function cloudSyncMeta(state: TwofaCloudSyncState, error: string | null | undefined) {
  if (state === "off") return { label: "Local only", className: "border-white/10 text-[var(--muted)]", icon: CloudOff };
  if (state === "syncing") return { label: "Syncing…", className: "border-sky-400/25 text-sky-200", icon: RefreshCw };
  if (state === "error") {
    return {
      label: error ? `Sync error` : "Sync error",
      className: "border-rose-400/30 text-rose-200",
      icon: CloudOff,
      title: error ?? "Cloud sync failed",
    };
  }
  if (state === "ok") return { label: "Vault synced", className: "border-emerald-400/25 text-emerald-200", icon: CloudUpload };
  return { label: "Vault idle", className: "border-white/10 text-[var(--muted)]", icon: CloudUpload };
}

export function TwofaFilterToolbar({
  range,
  limit,
  tableShown,
  filteredTotal,
  total,
  cloudState = "off",
  cloudError,
  onCloudSync,
  onDedupe,
}: Props) {
  const cloud = cloudSyncMeta(cloudState, cloudError);
  const CloudIcon = cloud.icon;

  return (
    <>
      <HubTimeRangeSelect value={range} />
      <HubRowLimitSelect value={limit} />
      <HubResultCount icon={Shield} shown={tableShown} total={filteredTotal} />
      {cloudState !== "off" ? (
        <button
          type="button"
          className={`inline-flex h-[var(--hub-control-h)] shrink-0 items-center gap-1 rounded-lg border bg-white/[.03] px-2.5 text-[10px] font-semibold transition-colors hover:bg-white/[.06] ${cloud.className}`}
          title={cloud.title ?? "Sync 2FA vault with cloud"}
          onClick={onCloudSync}
          disabled={cloudState === "syncing"}
        >
          <CloudIcon size={12} aria-hidden className={cloudState === "syncing" ? "animate-spin" : undefined} />
          {cloud.label}
        </button>
      ) : null}
      {filteredTotal < total ? (
        <span
          className="inline-flex h-[var(--hub-control-h)] shrink-0 items-center rounded-lg border border-white/10 bg-white/[.03] px-2.5 text-[10px] tabular-nums text-[var(--muted)]"
          title="Accounts in vault"
        >
          vault {total}
        </span>
      ) : null}
      {onDedupe ? (
        <button
          type="button"
          className="inline-flex h-[var(--hub-control-h)] shrink-0 items-center gap-1 rounded-lg border border-amber-400/25 bg-amber-400/10 px-2.5 text-[10px] font-semibold text-amber-200/90 transition-colors hover:bg-amber-400/20"
          title="Remove duplicate accounts (same platform + ID, or same secret-only)"
          onClick={onDedupe}
        >
          <GitMerge size={12} aria-hidden />
          Dedupe
        </button>
      ) : null}
    </>
  );
}
