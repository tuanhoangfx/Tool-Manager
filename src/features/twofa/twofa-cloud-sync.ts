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
import { dedupeTwofaAccounts } from "./twofa-upsert-accounts";

type CloudRowSets = {
  activeIds: Set<string>;
  tombstoneIds: Set<string>;
};

const LEGACY_SYNC_WATERMARK_KEY = "p0020-twofa-cloud-sync-at-v1";
const SYNC_WATERMARK_PREFIX = "p0020-twofa-cloud-sync-at-v2";
const PAGE_SIZE = 200;
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

async function fetchCloudRowSets(userId: string): Promise<{ sets: CloudRowSets; error: string | null }> {
  const client = getTwofaSupabase();
  if (!client) return { sets: { activeIds: new Set(), tombstoneIds: new Set() }, error: null };

  const { data, error } = await client.from("twofa_accounts").select("id, deleted_at").eq("user_id", userId);
  if (error) return { sets: { activeIds: new Set(), tombstoneIds: new Set() }, error: error.message };

  const activeIds = new Set<string>();
  const tombstoneIds = new Set<string>();
  for (const row of data ?? []) {
    const id = row.id as string;
    if (row.deleted_at) tombstoneIds.add(id);
    else activeIds.add(id);
  }
  return { sets: { activeIds, tombstoneIds }, error: null };
}

/** Rows only on device — never include tombstoned or in-flight delete ids. */
function filterPendingUploads(local: TwofaAccount[], sets: CloudRowSets): TwofaAccount[] {
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

/** Cloud-authoritative reconcile (Cookie Auto pattern): active DB snapshot + genuine pending uploads. */
export async function reconcileTwofaWithCloud(local: TwofaAccount[]): Promise<{
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
  const rowSets = await fetchCloudRowSets(userId);
  if (rowSets.error) return { accounts: local, error: rowSets.error };

  const remote = await fetchAllTwofaDbRows(userId, null, true);
  if (remote.error) return { accounts: local, error: remote.error };

  const remoteAccounts = remote.rows.map(twofaDbRowToAccount);
  const pendingLocal = filterPendingUploads(local, rowSets.sets);
  const merged = pendingLocal.length ? mergeAccounts(remoteAccounts, pendingLocal) : remoteAccounts;
  const { accounts: deduped } = dedupeTwofaAccounts(filterTwofaPendingDeletes(merged));
  writeWatermarkFromAccounts(userId, deduped, since);
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
  const remote = await fetchAllTwofaDbRows(userId, since, !since);
  if (remote.error) return { accounts: local, error: remote.error };

  let accounts = local;
  if (since) {
    const { accounts: next, maxUpdated } = applyTwofaCloudDelta(local, remote.rows);
    accounts = next;
    writeWatermarkFromMax(userId, maxUpdated, since);
  } else {
    const rowSets = await fetchCloudRowSets(userId);
    if (rowSets.error) return { accounts: local, error: rowSets.error };
    accounts = reconcileMergeFullPull(
      local,
      remote.rows.filter((row) => !row.deleted_at).map(twofaDbRowToAccount),
      rowSets.sets,
    );
    writeWatermarkFromAccounts(userId, accounts, since);
  }

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
export async function pushTwofaLocalOnly(local: TwofaAccount[]): Promise<string | null> {
  const session = await ensureTwofaAuth();
  if (!session?.user?.id) return null;

  const rowSets = await fetchCloudRowSets(session.user.id);
  if (rowSets.error) return rowSets.error;

  const pending = filterPendingUploads(filterTwofaPendingDeletes(local), rowSets.sets);
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

export async function runTwofaCloudSync(
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
    ? await reconcileTwofaWithCloud(getLocal())
    : await pullTwofaCloudDelta(getLocal());
  if (pulled.error) return pulled;

  const pushErr = await pushTwofaLocalOnly(getLocal());
  if (pushErr) return { accounts: pulled.accounts, error: pushErr };

  if (userId && !readWatermark(userId) && pulled.accounts.length) {
    return reconcileTwofaWithCloud(getLocal());
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
    return runTwofaCloudSync(getLocal, { full: true });
  }

  return pulled;
}
