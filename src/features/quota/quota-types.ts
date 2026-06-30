/** Live quota probe result stored in twofa_accounts.quota_snapshot */
export type QuotaProbeMetric = {
  key: string;
  label: string;
  used?: number | null;
  limit?: number | null;
  remaining?: number | null;
  unit?: string | null;
  resetAt?: string | null;
};

export type QuotaSnapshot = {
  platform: string;
  planLabel?: string | null;
  tierLabel?: string | null;
  metrics: QuotaProbeMetric[];
  raw?: unknown;
  error?: string | null;
  probedAt: string;
};

export type QuotaProbeStatus = "ok" | "stale" | "error" | "unsupported" | "no_credential";

export type QuotaProbeResult = {
  id: string;
  quotaStatus: QuotaProbeStatus | string;
  quotaSnapshot: QuotaSnapshot;
  quotaCheckedAt: string;
  planTier?: string;
  planPackage?: string;
};

export type CockpitImportPatch = {
  id: string;
  quotaEnrolledAt?: string;
  quotaStatus?: string;
  planPackage?: string;
  planTier?: string;
  quotaSnapshot?: QuotaSnapshot;
  quotaCheckedAt?: string;
  note?: string;
  password?: string;
};
