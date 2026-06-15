import { ensureTwofaAuth } from "../../lib/ensure-twofa-auth";
import { isTwofaSupabaseConfigured } from "../../lib/twofa-supabase-env";
import { getTwofaSupabase } from "../../lib/twofa-supabase";
import type { TwofaAccount, TwofaDraft } from "./types";
import {
  applyTwofaCloudDelta,
  twofaDbRowToAccount,
  type TwofaDbRow,
} from "./twofa-cloud-delta";
import { filterTwofaPendingDeletes } from "./twofa-sync-pending";
import {
  dedupeTwofaAccounts,
  type TwofaDedupePreview,
} from "./twofa-upsert-accounts";

type CloudRowSets = {
  activeIds: Set<string>;
  tombstoneIds: Set<string>;
};

const LEGACY_SYNC_WATERMARK_KEY = "p0020-twofa-cloud-sync-at-v1";
const SYNC_WATERMARK_PREFIX = "p0020-twofa-cloud-sync-at-v2";
const PAGE_SIZE = 500;
const SELECT_COLS =
  "id,service,browser,account,password,secret,created_at,updated_at,last_used_at,deleted_at";

export type TwofaCloudSyncState = "off" | "idle" | "syncing" | "ok" | "error";

function accountToPayload(account: TwofaAccount, userId: string) {
  return {
    id: account.id,
    user_id: userId,
    service: account.service,
    browser: account.browser?.trim() || null,
    account: account.account,
    password: account.password?.trim() || null,
    secret: account.secret,
    created_at: account.createdAt,
    updated_at: account.updatedAt,
    last_used_at: account.lastUsedAt ?? null,
    deleted_at: null,
  };
}

function draftToPayload(id: string, draft: TwofaDraft, userId: string, now: string) {
  return {
    id,
    user_id: userId,
    service: draft.service.trim(),
    browser: draft.browser?.trim() || null,
    account: draft.account.trim(),
    password: draft.password?.trim() || null,
    secret: draft.secret,
    created_at: now,
    updated_at: now,
    last_used_at: null,
    deleted_at: null,
  };
}

function mergeAccounts(local: TwofaAccount[], remote: TwofaAccount[]): TwofaAccount[] {
  const byId = new Map<string, TwofaAccount>();
  for (const row of local) byId.set(row.id, row);
  for (const row of remote) {
    const prev = byId.get(row.id);
    if (!prev || Date.parse(row.updatedAt) >= Date.parse(prev.updatedAt)) {
      byId.set(row.id, row);
    }
  }
  return [...byId.values()].sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || a.service.localeCompare(b.service),
  );
}

function watermarkKey(userId: string) {
  return `${SYNC_WATERMARK_PREFIX}:${userId}`;
}

function readWatermark(userId: string): string | null {
  try {
    const scoped = localStorage.getItem(watermarkKey(userId));
    if (scoped) return scoped;
    const legacy = localStorage.getItem(LEGACY_SYNC_WATERMARK_KEY);
    if (legacy) {
      localStorage.removeItem(LEGACY_SYNC_WATERMARK_KEY);
      return null;
    }
    return null;
  } catch {
    return null;
  }
}

function writeWatermark(userId: string, iso: string) {
  localStorage.setItem(watermarkKey(userId), iso);
}

/** Force a full cloud pull on next sync (recovery). */
export function clearTwofaSyncWatermark(userId?: string | null) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LEGACY_SYNC_WATERMARK_KEY);
    if (userId) localStorage.removeItem(watermarkKey(userId));
  } catch {
    /* private mode */
  }
}

export function isTwofaCloudAvailable(): boolean {
  return isTwofaSupabaseConfigured;
}

export type TwofaCloudRunOpts = {
  /** Clear per-user watermark and pull the entire vault from cloud. */
  full?: boolean;
  /** Cloud snapshot reconcile without clearing watermark (realtime DELETE). */
  reconcile?: boolean;
};

export function hasTwofaSyncWatermark(userId: string): boolean {
  return readWatermark(userId) !== null;
}

/** Build active/tombstone id sets from a full vault row scan. */
export function rowSetsFromDbRows(rows: TwofaDbRow[]): CloudRowSets {
  const activeIds = new Set<string>();
  const tombstoneIds = new Set<string>();
  for (const row of rows) {
    if (row.deleted_at) tombstoneIds.add(row.id);
    else activeIds.add(row.id);
  }
  return { activeIds, tombstoneIds };
}

type VaultPullPayload = {
  userId: string;
  coalesceKey: string;
  rows: TwofaDbRow[];
  sets: CloudRowSets;
  since: string | null;
};

let pullCache: (VaultPullPayload & { at: number }) | null = null;
const pullInflight = new Map<string, Promise<VaultPullPayload>>();
const PULL_CACHE_TTL_MS = 5000;

function vaultPullCoalesceKey(
  userId: string,
  mode: "auth-active" | "auth-all" | "delta",
  since: string | null,
): string {
  return `${userId}:${mode}:${since ?? ""}`;
}

function recentVaultRowSets(userId: string): CloudRowSets | null {
  if (
    pullCache &&
    pullCache.userId === userId &&
    Date.now() - pullCache.at < PULL_CACHE_TTL_MS
  ) {
    return pullCache.sets;
  }
  return null;
}

/** Shared paginated vault pull — coalesces parallel callers (prefetch + tab hook). */
async function pullTwofaVault(
  userId: string,
  mode: "auth-active" | "auth-all" | "delta",
  since: string | null,
): Promise<{ payload: VaultPullPayload; error: string | null }> {
  const coalesceKey = vaultPullCoalesceKey(userId, mode, since);
  const cached = pullCache;
  if (cached && cached.coalesceKey === coalesceKey && Date.now() - cached.at < PULL_CACHE_TTL_MS) {
    return { payload: cached, error: null };
  }

  let inflight = pullInflight.get(coalesceKey);
  if (!inflight) {
    inflight = (async (): Promise<VaultPullPayload> => {
      const activeOnly = mode === "auth-active";
      const remote = await fetchAllTwofaDbRows(userId, mode === "delta" ? since : null, activeOnly);
      if (remote.error) throw new Error(remote.error);
      const payload: VaultPullPayload = {
        userId,
        coalesceKey,
        rows: remote.rows,
        sets: rowSetsFromDbRows(remote.rows),
        since,
      };
      if (mode !== "delta") {
        pullCache = { ...payload, at: Date.now() };
      }
      return payload;
    })().finally(() => {
      pullInflight.delete(coalesceKey);
    });
    pullInflight.set(coalesceKey, inflight);
  }

  try {
    return { payload: await inflight, error: null };
  } catch (err) {
    return { payload: { userId, coalesceKey, rows: [], sets: { activeIds: new Set(), tombstoneIds: new Set() }, since }, error: err instanceof Error ? err.message : "Cloud pull failed" };
  }
}

async function fetchCloudRowSets(userId: string): Promise<{ sets: CloudRowSets; error: string | null }> {
  const cached = recentVaultRowSets(userId);
  if (cached) return { sets: cached, error: null };
  const client = getTwofaSupabase();
  if (!client) return { sets: { activeIds: new Set(), tombstoneIds: new Set() }, error: null };

  const activeIds = new Set<string>();
  const tombstoneIds = new Set<string>();
  let page = 0;

  for (;;) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await client
      .from("twofa_accounts")
      .select("id, deleted_at")
      .eq("user_id", userId)
      .order("id", { ascending: true })
      .range(from, to);
    if (error) return { sets: { activeIds, tombstoneIds }, error: error.message };

    const chunk = data ?? [];
    if (!chunk.length) break;
    for (const row of chunk) {
      const id = row.id as string;
      if (row.deleted_at) tombstoneIds.add(id);
      else activeIds.add(id);
    }
    page += 1;
    if (chunk.length < PAGE_SIZE) break;
  }

  return { sets: { activeIds, tombstoneIds }, error: null };
}

/** Rows only on device — never include tombstoned or in-flight delete ids. */
export function filterPendingUploads(local: TwofaAccount[], sets: CloudRowSets): TwofaAccount[] {
  return local.filter(
    (row) => !sets.activeIds.has(row.id) && !sets.tombstoneIds.has(row.id),
  );
}

async function fetchTwofaCloudPage(
  userId: string,
  page: number,
  since: string | null,
  activeOnly: boolean,
): Promise<{ rows: TwofaDbRow[]; error: string | null }> {
  const client = getTwofaSupabase();
  if (!client) return { rows: [], error: null };

  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  let q = client
    .from("twofa_accounts")
    .select(SELECT_COLS)
    .eq("user_id", userId)
    .order("updated_at", { ascending: true })
    .order("id", { ascending: true })
    .range(from, to);

  if (activeOnly) q = q.is("deleted_at", null);
  if (since) q = q.gt("updated_at", since);

  const { data, error } = await q;
  if (error) return { rows: [], error: error.message };
  return { rows: (data ?? []) as TwofaDbRow[], error: null };
}

async function fetchAllTwofaDbRows(
  userId: string,
  since: string | null,
  activeOnly: boolean,
): Promise<{ rows: TwofaDbRow[]; error: string | null }> {
  const rows: TwofaDbRow[] = [];
  let page = 0;

  for (;;) {
    const pageResult = await fetchTwofaCloudPage(userId, page, since, activeOnly);
    if (pageResult.error) return { rows, error: pageResult.error };
    if (!pageResult.rows.length) break;
    rows.push(...pageResult.rows);
    page += 1;
    if (pageResult.rows.length < PAGE_SIZE) break;
  }

  return { rows, error: null };
}

function writeWatermarkFromMax(userId: string, maxUpdated: string, since: string | null) {
  if (maxUpdated && (!since || maxUpdated > since)) writeWatermark(userId, maxUpdated);
}

function writeWatermarkFromAccounts(userId: string, accounts: TwofaAccount[], since: string | null) {
  const maxUpdated = accounts.reduce((max, a) => (a.updatedAt > max ? a.updatedAt : max), since ?? "");
  writeWatermarkFromMax(userId, maxUpdated, since);
}

export type TwofaReconcileOpts = {
  /** Boot / manual full sync — cloud snapshot only (no stale per-browser local extras). */
  cloudOnly?: boolean;
};

/** Cloud-authoritative reconcile (Cookie Auto pattern): active DB snapshot + genuine pending uploads. */
export async function reconcileTwofaWithCloud(
  local: TwofaAccount[],
  opts?: TwofaReconcileOpts,
): Promise<{
  accounts: TwofaAccount[];
  error: string | null;
}> {
  const session = await ensureTwofaAuth();
  const client = getTwofaSupabase();
  if (!session?.user?.id || !client) {
    return { accounts: local, error: null };
  }

  const userId = session.user.id;
  const since = readWatermark(userId);

  const mode = opts?.cloudOnly ? "auth-active" : "auth-all";
  const pulled = await pullTwofaVault(userId, mode, null);
  if (pulled.error) return { accounts: local, error: pulled.error };

  const remoteAccounts = pulled.payload.rows
    .filter((row) => !row.deleted_at)
    .map(twofaDbRowToAccount);
  let pendingLocal: TwofaAccount[] = [];
  if (!opts?.cloudOnly) {
    pendingLocal = filterPendingUploads(local, pulled.payload.sets);
  }
  const merged = pendingLocal.length ? mergeAccounts(remoteAccounts, pendingLocal) : remoteAccounts;
  const { accounts: deduped } = dedupeTwofaAccounts(filterTwofaPendingDeletes(merged));
  if (deduped.length) {
    writeWatermarkFromAccounts(userId, deduped, since);
  } else if (opts?.cloudOnly || !since) {
    writeWatermark(userId, new Date().toISOString());
  }
  return { accounts: deduped, error: null };
}

/** Delta pull (paginated). Tombstones remove local rows; full import when watermark missing. */
export async function pullTwofaCloudDelta(local: TwofaAccount[]): Promise<{
  accounts: TwofaAccount[];
  error: string | null;
}> {
  const session = await ensureTwofaAuth();
  const client = getTwofaSupabase();
  if (!session?.user?.id || !client) {
    return { accounts: local, error: null };
  }

  const userId = session.user.id;
  const since = readWatermark(userId);

  if (since) {
    const pulled = await pullTwofaVault(userId, "delta", since);
    if (pulled.error) return { accounts: local, error: pulled.error };
    const { accounts: next, maxUpdated } = applyTwofaCloudDelta(local, pulled.payload.rows);
    const { accounts: deduped } = dedupeTwofaAccounts(filterTwofaPendingDeletes(next));
    writeWatermarkFromMax(userId, maxUpdated, since);
    return { accounts: deduped, error: null };
  }

  const pulled = await pullTwofaVault(userId, "auth-all", null);
  if (pulled.error) return { accounts: local, error: pulled.error };
  const accounts = reconcileMergeFullPull(
    local,
    pulled.payload.rows.filter((row) => !row.deleted_at).map(twofaDbRowToAccount),
    pulled.payload.sets,
  );
  writeWatermarkFromAccounts(userId, accounts, since);

  const { accounts: deduped } = dedupeTwofaAccounts(filterTwofaPendingDeletes(accounts));
  return { accounts: deduped, error: null };
}

/** Full vault pull: cloud snapshot + genuine pending uploads only. */
function reconcileMergeFullPull(
  local: TwofaAccount[],
  remote: TwofaAccount[],
  sets: CloudRowSets,
): TwofaAccount[] {
  const pendingLocal = filterPendingUploads(local, sets);
  return pendingLocal.length ? [...remote, ...pendingLocal] : remote;
}

/** Push genuine local-only rows (never tombstoned / in-flight deletes). */
export async function pushTwofaLocalOnly(
  local: TwofaAccount[],
  rowSets?: CloudRowSets,
): Promise<string | null> {
  const session = await ensureTwofaAuth();
  if (!session?.user?.id) return null;

  let sets = rowSets ?? recentVaultRowSets(session.user.id);
  if (!sets) {
    const fetched = await fetchCloudRowSets(session.user.id);
    if (fetched.error) return fetched.error;
    sets = fetched.sets;
  }

  const pending = filterPendingUploads(filterTwofaPendingDeletes(local), sets);
  if (!pending.length) return null;

  for (const row of pending) {
    const { error } = await upsertTwofaCloud(row);
    if (error) return error;
  }
  return null;
}

export type TwofaCloudUpsertResult = {
  error: string | null;
  /** Cloud row id — differs from local when identity already existed under another uuid. */
  cloudId?: string;
};

export async function upsertTwofaCloud(account: TwofaAccount): Promise<TwofaCloudUpsertResult> {
  const session = await ensureTwofaAuth();
  const client = getTwofaSupabase();
  if (!session?.user?.id || !client) return { error: null };
  const payload = accountToPayload(account, session.user.id);
  const { error } = await client.from("twofa_accounts").upsert(payload, { onConflict: "id" });
  if (!error) return { error: null, cloudId: account.id };

  if (error.code !== "23505") return { error: error.message };

  let existingQ = client
    .from("twofa_accounts")
    .select("id")
    .eq("user_id", session.user.id)
    .eq("service", account.service)
    .eq("account", account.account)
    .is("deleted_at", null);
  const browser = account.browser?.trim() || "";
  existingQ = browser ? existingQ.eq("browser", browser) : existingQ.or("browser.is.null,browser.eq.");
  const { data: existing, error: findError } = await existingQ.maybeSingle();
  if (findError || !existing?.id) return { error: error.message };

  if (existing.id !== account.id) {
    await tombstoneTwofaCloudRow(session.user.id, account.id);
  }
  const { error: retryError } = await client
    .from("twofa_accounts")
    .upsert({ ...payload, id: existing.id as string }, { onConflict: "id" });
  return { error: retryError?.message ?? null, cloudId: existing.id as string };
}

export async function upsertTwofaCloudDraft(id: string, draft: TwofaDraft, now: string): Promise<string | null> {
  const session = await ensureTwofaAuth();
  const client = getTwofaSupabase();
  if (!session?.user?.id || !client) return null;
  const { error } = await client
    .from("twofa_accounts")
    .upsert(draftToPayload(id, draft, session.user.id, now), { onConflict: "id" });
  return error?.message ?? null;
}

async function tombstoneTwofaCloudRow(userId: string, id: string): Promise<string | null> {
  const client = getTwofaSupabase();
  if (!client) return null;
  const now = new Date().toISOString();
  const { error } = await client
    .from("twofa_accounts")
    .update({ deleted_at: now })
    .eq("user_id", userId)
    .eq("id", id)
    .is("deleted_at", null);
  return error?.message ?? null;
}

/** Soft-delete (tombstone) — delta sync propagates via updated_at. */
export async function deleteTwofaCloud(id: string): Promise<string | null> {
  const session = await ensureTwofaAuth();
  if (!session?.user?.id) return null;
  return tombstoneTwofaCloudRow(session.user.id, id);
}

/** Scan cloud + local vault for duplicates before removal. */
export async function previewTwofaDedupeCombined(
  local: TwofaAccount[],
): Promise<{ preview: TwofaDedupePreview; error: string | null }> {
  const removedIds = new Set<string>();
  const serviceById = new Map<string, string>();

  const scan = (accounts: TwofaAccount[]) => {
    for (const row of accounts) {
      serviceById.set(row.id, row.service.trim() || "Others");
    }
    const { removedIds: ids } = dedupeTwofaAccounts(accounts);
    for (const id of ids) removedIds.add(id);
  };

  const session = await ensureTwofaAuth();
  const client = getTwofaSupabase();
  if (session?.user?.id && client) {
    const remote = await fetchAllTwofaDbRows(session.user.id, null, true);
    if (remote.error) {
      return { preview: { totalRemoved: 0, byService: [] }, error: remote.error };
    }
    scan(remote.rows.map(twofaDbRowToAccount));
  }

  scan(local);

  const byServiceMap = new Map<string, number>();
  for (const id of removedIds) {
    const service = serviceById.get(id) ?? "Others";
    byServiceMap.set(service, (byServiceMap.get(service) ?? 0) + 1);
  }
  const byService = [...byServiceMap.entries()]
    .map(([service, count]) => ({ service, count }))
    .sort((a, b) => b.count - a.count || a.service.localeCompare(b.service));

  return {
    preview: { totalRemoved: removedIds.size, byService },
    error: null,
  };
}

/** Tombstone duplicate cloud rows — keep newest updatedAt per identity key. */
export async function dedupeTwofaCloudByIdentity(): Promise<{
  removed: number;
  error: string | null;
}> {
  const session = await ensureTwofaAuth();
  const client = getTwofaSupabase();
  if (!session?.user?.id || !client) return { removed: 0, error: null };

  const userId = session.user.id;
  const remote = await fetchAllTwofaDbRows(userId, null, true);
  if (remote.error) return { removed: 0, error: remote.error };

  const accounts = remote.rows.map(twofaDbRowToAccount);
  const { removedIds } = dedupeTwofaAccounts(accounts);
  if (!removedIds.length) return { removed: 0, error: null };

  let removed = 0;
  for (const id of removedIds) {
    const err = await tombstoneTwofaCloudRow(userId, id);
    if (err) return { removed, error: err };
    removed += 1;
  }
  return { removed, error: null };
}

let syncSerial: Promise<unknown> = Promise.resolve();

export async function runTwofaCloudSync(
  getLocal: () => TwofaAccount[],
  opts?: TwofaCloudRunOpts,
): Promise<{
  accounts: TwofaAccount[];
  error: string | null;
}> {
  const run = () => runTwofaCloudSyncInner(getLocal, opts);
  const next = syncSerial.then(run, run);
  syncSerial = next.then(
    () => {},
    () => {},
  );
  return next;
}

async function runTwofaCloudSyncInner(
  getLocal: () => TwofaAccount[],
  opts?: TwofaCloudRunOpts,
): Promise<{
  accounts: TwofaAccount[];
  error: string | null;
}> {
  const session = await ensureTwofaAuth();
  const userId = session?.user?.id;
  if (opts?.full && userId) clearTwofaSyncWatermark(userId);

  const hasWatermark = userId ? readWatermark(userId) !== null : false;
  const useAuthoritative = opts?.full || opts?.reconcile || !hasWatermark;

  const pulled = useAuthoritative
    ? await reconcileTwofaWithCloud(getLocal(), { cloudOnly: opts?.full })
    : await pullTwofaCloudDelta(getLocal());
  if (pulled.error) return pulled;

  if (!opts?.full) {
    const pushSets = userId ? recentVaultRowSets(userId) ?? undefined : undefined;
    const pushErr = await pushTwofaLocalOnly(pulled.accounts, pushSets);
    if (pushErr) return { accounts: pulled.accounts, error: pushErr };
  }

  const local = getLocal();
  if (
    !opts?.full &&
    userId &&
    readWatermark(userId) &&
    pulled.accounts.length === 0 &&
    local.length === 0
  ) {
    clearTwofaSyncWatermark(userId);
    return runTwofaCloudSyncInner(getLocal, { full: true });
  }

  return pulled;
}
