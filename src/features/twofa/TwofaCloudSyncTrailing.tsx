import { useEffect, useRef, useState } from "react";
import { CloudOff, RefreshCw } from "lucide-react";
import type { TwofaCloudSyncState } from "./twofa-cloud-sync";

const VAULT_IDLE_RETRY_MS = 10_000;

function cloudSyncMeta(
  state: TwofaCloudSyncState,
  error: string | null | undefined,
  staleIdle: boolean,
) {
  if (state === "syncing") return { label: "Syncing…", className: "border-sky-400/25 text-sky-200", icon: RefreshCw };
  if (state === "error") {
    return {
      label: "Sync error",
      className: "border-rose-400/30 text-rose-200",
      icon: CloudOff,
      title: error ?? "Cloud sync failed",
    };
  }
  if (state === "idle" && staleIdle) {
    return {
      label: "Connecting vault…",
      className: "border-amber-400/25 text-amber-200",
      icon: RefreshCw,
      title: "Retrying full sync with cloud vault",
    };
  }
  return null;
}

type Props = {
  filteredTotal: number;
  total: number;
  cloudState?: TwofaCloudSyncState;
  cloudError?: string | null;
  onCloudSync?: () => void;
};

/** 2FA-only trailing chips for `DirectorySearchToolbar`. */
export function TwofaCloudSyncTrailing({
  filteredTotal,
  total,
  cloudState = "off",
  cloudError,
  onCloudSync,
}: Props) {
  const [staleIdle, setStaleIdle] = useState(false);
  const retriedRef = useRef(false);

  useEffect(() => {
    if (cloudState !== "idle") {
      setStaleIdle(false);
      retriedRef.current = false;
      return;
    }
    const showTimer = window.setTimeout(() => setStaleIdle(true), VAULT_IDLE_RETRY_MS);
    const retryTimer = window.setTimeout(() => {
      if (!retriedRef.current && onCloudSync) {
        retriedRef.current = true;
        onCloudSync();
      }
    }, VAULT_IDLE_RETRY_MS);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(retryTimer);
    };
  }, [cloudState, onCloudSync]);

  const cloud = cloudSyncMeta(cloudState, cloudError, staleIdle);
  const CloudIcon = cloud?.icon;

  return (
    <>
      {cloud && CloudIcon ? (
        <button
          type="button"
          className={`inline-flex h-[var(--hub-control-h)] shrink-0 items-center gap-1 rounded-lg border bg-white/[.03] px-2.5 text-[10px] font-semibold transition-colors hover:bg-white/[.06] ${cloud.className}`}
          title={cloud.title ?? "Retry cloud vault sync"}
          onClick={onCloudSync}
          disabled={cloudState === "syncing"}
        >
          <CloudIcon
            size={12}
            aria-hidden
            className={cloudState === "syncing" || staleIdle ? "animate-spin" : undefined}
          />
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
    </>
  );
}
