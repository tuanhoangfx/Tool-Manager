import type { CockpitImportPatch, QuotaProbeResult } from "./quota-types";

const PROBE_URL = "/api/quota-probe";
const COCKPIT_SYNC_URL = "/api/quota-cockpit-sync";
const COCKPIT_IMPORT_URL = "/api/quota-cockpit-import";
const STEALTH_OPEN_URL = "/api/quota-stealth-open";

export type QuotaProbeAccountInput = {
  id: string;
  service: string;
  password?: string;
  note?: string;
};

export type CockpitImportOutcome = {
  cockpitCount: number;
  matched: number;
  created?: number;
  skipped?: number;
  accounts?: {
    email: string;
    platform: string;
    quotaStatus: string;
    metrics: unknown[];
  }[];
  unmatched: { email: string; platform: string }[];
  patches: CockpitImportPatch[];
};

export async function probeQuotaAccounts(
  accounts: QuotaProbeAccountInput[],
): Promise<QuotaProbeResult[]> {
  const res = await fetch(PROBE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accounts }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Quota probe API ${res.status}: ${text.slice(0, 200)}`);
  }
  const body = (await res.json()) as { results?: QuotaProbeResult[] };
  return body.results ?? [];
}

export async function syncCockpitQuotaLocal(dataDir?: string): Promise<CockpitImportOutcome> {
  const res = await fetch(COCKPIT_SYNC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dataDir ? { dataDir } : {}),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cockpit sync ${res.status}: ${text.slice(0, 240)}`);
  }
  return (await res.json()) as CockpitImportOutcome;
}

export async function importCockpitBackupJson(backup: unknown): Promise<CockpitImportOutcome> {
  const res = await fetch(COCKPIT_IMPORT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ backup }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cockpit import ${res.status}: ${text.slice(0, 240)}`);
  }
  return (await res.json()) as CockpitImportOutcome;
}

export async function openQuotaStealthSession(
  profileName: string,
  targetUrl = "https://www.cursor.com/settings",
): Promise<void> {
  const res = await fetch(STEALTH_OPEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profileName, targetUrl }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Stealth open ${res.status}: ${text.slice(0, 240)}`);
  }
}

export function isQuotaProbeApiLikelyAvailable(): boolean {
  return import.meta.env.DEV;
}
