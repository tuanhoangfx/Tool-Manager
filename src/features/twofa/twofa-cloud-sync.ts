import { ensureTwofaAuth } from "../../lib/ensure-twofa-auth";
import { isTwofaSupabaseConfigured } from "../../lib/twofa-supabase-env";
import { getTwofaSupabase } from "../../lib/twofa-supabase";
import type { TwofaAccount, TwofaDraft } from "./types";
import { dedupeTwofaAccounts } from "./twofa-upsert-accounts";

const SYNC_WATERMARK_KEY = "p0020-twofa-cloud-sync-at-v1";
const PAGE_SIZE = 200;

export type TwofaCloudSyncState = "off" | "idle" | "syncing" | "ok" | "error";

type DbRow = {
  id: string;
  service: string;
  browser: string | null;
  account: string;
  password: string | null;
  secret: string;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
};

function rowToAccount(row: DbRow): TwofaAccount {
  return {
    id: row.id,
    service: row.service,
    ...(row.browser?.trim() ? { browser: row.browser.trim() } : {}),
    account: row.account,
    ...(row.password?.trim() ? { password: row.password.trim() } : {}),
    secret: row.secret,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.last_used_at ? { lastUsedAt: row.last_used_at } : {}),
  };
}

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

function readWatermark(): string | null {
  try {
    return localStorage.getItem(SYNC_WATERMARK_KEY);
  } catch {
    return null;
  }
}

function writeWatermark(iso: string) {
  localStorage.setItem(SYNC_WATERMARK_KEY, iso);
}

export function isTwofaCloudAvailable(): boolean {
  return isTwofaSupabaseConfigured;
}

/** Delta pull (paginated). Full import when watermark missing. */
export async function pullTwofaCloudDelta(local: TwofaAccount[]): Promise<{
  accounts: TwofaAccount[];
  error: string | null;
}> {
  const session = await ensureTwofaAuth();
  const client = getTwofaSupabase();
  if (!session?.user?.id || !client) {
    return { accounts: local, error: null };
  }

  const since = readWatermark();
  const remote: TwofaAccount[] = [];
  let page = 0;

  for (;;) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let q = client
      .from("twofa_accounts")
      .select("id,service,browser,account,password,secret,created_at,updated_at,last_used_at")
      .eq("user_id", session.user.id)
      .order("updated_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to);

    if (since) q = q.gt("updated_at", since);

    const { data, error } = await q;
    if (error) return { accounts: local, error: error.message };
    const rows = (data ?? []) as DbRow[];
    if (!rows.length) break;
    remote.push(...rows.map(rowToAccount));
    page += 1;
    if (rows.length < PAGE_SIZE) break;
  }

  const merged = remote.length > 0 ? mergeAccounts(local, remote) : local;
  const { accounts: deduped } = dedupeTwofaAccounts(merged);
  const maxUpdated = deduped.reduce((max, a) => (a.updatedAt > max ? a.updatedAt : max), since ?? "");
  if (maxUpdated) writeWatermark(maxUpdated);

  return { accounts: deduped, error: null };
}

/** Push local-only rows (not on server) after delta pull. */
export async function pushTwofaLocalOnly(local: TwofaAccount[]): Promise<string | null> {
  const session = await ensureTwofaAuth();
  const client = getTwofaSupabase();
  if (!session?.user?.id || !client) return null;

  const { data: ids, error: listError } = await client
    .from("twofa_accounts")
    .select("id")
    .eq("user_id", session.user.id);
  if (listError) return listError.message;

  const remoteIds = new Set((ids ?? []).map((r) => r.id as string));
  const pending = local.filter((a) => !remoteIds.has(a.id));
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
    .eq("account", account.account);
  const browser = account.browser?.trim() || "";
  existingQ = browser ? existingQ.eq("browser", browser) : existingQ.or("browser.is.null,browser.eq.");
  const { data: existing, error: findError } = await existingQ.maybeSingle();
  if (findError || !existing?.id) return { error: error.message };

  if (existing.id !== account.id) {
    await client.from("twofa_accounts").delete().eq("user_id", session.user.id).eq("id", account.id);
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

export async function deleteTwofaCloud(id: string): Promise<string | null> {
  const session = await ensureTwofaAuth();
  const client = getTwofaSupabase();
  if (!session?.user?.id || !client) return null;
  const { error } = await client.from("twofa_accounts").delete().eq("user_id", session.user.id).eq("id", id);
  return error?.message ?? null;
}

export async function runTwofaCloudSync(local: TwofaAccount[]): Promise<{
  accounts: TwofaAccount[];
  error: string | null;
}> {
  const pulled = await pullTwofaCloudDelta(local);
  if (pulled.error) return pulled;
  const pushErr = await pushTwofaLocalOnly(pulled.accounts);
  if (pushErr) return { accounts: pulled.accounts, error: pushErr };
  if (!readWatermark() && pulled.accounts.length) {
    return pullTwofaCloudDelta(pulled.accounts);
  }
  return pulled;
}
