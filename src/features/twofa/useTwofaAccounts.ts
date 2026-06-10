import { useCallback, useEffect, useRef, useState } from "react";
import { getTwofaStorageUserId, loadAccounts, saveAccounts } from "./storage";
import type { TwofaAccount, TwofaDraft } from "./types";
import { ensureTwofaAuth } from "../../lib/ensure-twofa-auth";
import {
  deleteTwofaCloud,
  isTwofaCloudAvailable,
  runTwofaCloudSync,
  upsertTwofaCloud,
  type TwofaCloudSyncState,
} from "./twofa-cloud-sync";
import {
  dedupeTwofaAccounts,
  updateTwofaDraft,
  upsertTwofaDraft,
} from "./twofa-upsert-accounts";
import {
  filterTwofaPendingDeletes,
  markTwofaPendingDelete,
} from "./twofa-sync-pending";
import { useTwofaRealtime } from "./useTwofaRealtime";

export type TwofaCloudSyncOpts = {
  /** Skip syncing badge — use for realtime refresh */
  silent?: boolean;
  /** Pull entire vault (login, manual sync). Clears watermark. */
  full?: boolean;
  /** Cloud snapshot reconcile — propagates remote deletes (realtime). */
  reconcile?: boolean;
};

export type TwofaAddManyResult = {
  added: number;
  replaced: number;
  total: number;
};

export type TwofaSaveResult = { ok: true; replaced: boolean } | { ok: false };

export type TwofaFullSyncNotice = {
  count: number;
  id: number;
};

const FULL_SYNC_TOAST_DEBOUNCE_MS = 1500;

function loadDedupedAccounts(userId?: string | null): TwofaAccount[] {
  const loaded = loadAccounts(userId);
  const { accounts: deduped, removedIds } = dedupeTwofaAccounts(loaded);
  if (removedIds.length) saveAccounts(deduped, userId);
  return deduped;
}

export function useTwofaAccounts() {
  const [accounts, setAccounts] = useState<TwofaAccount[]>(loadDedupedAccounts);
  const accountsRef = useRef(accounts);
  accountsRef.current = accounts;

  const [tick, setTick] = useState(0);
  const [cloudState, setCloudState] = useState<TwofaCloudSyncState>(
    isTwofaCloudAvailable() ? "idle" : "off",
  );
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [fullSyncNotice, setFullSyncNotice] = useState<TwofaFullSyncNotice | null>(null);
  const syncInFlight = useRef(false);
  const syncGeneration = useRef(0);
  const pendingSilentSync = useRef(false);
  const pendingFullSync = useRef(false);
  const vaultUserIdRef = useRef<string | null>(getTwofaStorageUserId());
  const lastFullSyncEmitRef = useRef(0);

  const persistAccounts = useCallback((next: TwofaAccount[]) => {
    saveAccounts(next, vaultUserIdRef.current);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => persistAccounts(accounts), 280);
    return () => window.clearTimeout(timer);
  }, [accounts, persistAccounts]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const applyAccounts = useCallback(
    (next: TwofaAccount[]) => {
      accountsRef.current = next;
      setAccounts(next);
      persistAccounts(next);
    },
    [persistAccounts],
  );

  const syncFromCloud = useCallback(async (opts?: TwofaCloudSyncOpts) => {
    if (!isTwofaCloudAvailable()) return;
    const silent = opts?.silent ?? false;
    if (syncInFlight.current) {
      if (silent) pendingSilentSync.current = true;
      else if (opts?.full) pendingFullSync.current = true;
      return;
    }
    const generation = ++syncGeneration.current;
    syncInFlight.current = true;
    if (!silent) {
      setCloudState("syncing");
      setCloudError(null);
    }
    try {
      const getLocal = () => accountsRef.current;
      const { accounts: merged, error } = await runTwofaCloudSync(getLocal, {
        full: opts?.full,
        reconcile: opts?.reconcile,
      });
      if (generation !== syncGeneration.current) return;
      if (error) {
        setCloudState("error");
        setCloudError(error);
        return;
      }
      const { accounts: deduped } = dedupeTwofaAccounts(merged);
      const next = filterTwofaPendingDeletes(deduped);
      if (generation !== syncGeneration.current) return;
      applyAccounts(next);
      setCloudState("ok");
      if (opts?.full && !silent) {
        const now = Date.now();
        if (now - lastFullSyncEmitRef.current >= FULL_SYNC_TOAST_DEBOUNCE_MS) {
          lastFullSyncEmitRef.current = now;
          setFullSyncNotice({ count: next.length, id: now });
        }
      }
    } finally {
      if (generation === syncGeneration.current) syncInFlight.current = false;
      if (pendingFullSync.current) {
        pendingFullSync.current = false;
        void syncFromCloud({ full: true });
      } else if (pendingSilentSync.current) {
        pendingSilentSync.current = false;
        void syncFromCloud({ silent: true, reconcile: true });
      }
    }
  }, [applyAccounts]);

  const ackFullSyncNotice = useCallback(() => {
    setFullSyncNotice(null);
  }, []);

  const reloadForVaultUser = useCallback((): boolean => {
    const uid = getTwofaStorageUserId();
    if (uid === vaultUserIdRef.current) return false;
    vaultUserIdRef.current = uid;
    applyAccounts(loadDedupedAccounts(uid));
    return true;
  }, [applyAccounts]);

  const resolveVaultUserId = useCallback(async (): Promise<string | null> => {
    const session = await ensureTwofaAuth();
    return session?.user?.id ?? getTwofaStorageUserId();
  }, []);

  const syncFromRealtime = useCallback(() => {
    void syncFromCloud({ silent: true, reconcile: true });
  }, [syncFromCloud]);

  useTwofaRealtime(syncFromRealtime, isTwofaCloudAvailable());

  useEffect(() => {
    if (!isTwofaCloudAvailable()) return;

    let sessionSyncTimer = 0;

    const scheduleSessionSync = (full: boolean) => {
      window.clearTimeout(sessionSyncTimer);
      sessionSyncTimer = window.setTimeout(() => {
        void syncFromCloud({ silent: true, full, reconcile: !full });
      }, 200);
    };

    const onTwofaSession = () => {
      void resolveVaultUserId().then((uid) => {
        if (uid && uid !== vaultUserIdRef.current) {
          vaultUserIdRef.current = uid;
          applyAccounts(loadDedupedAccounts(uid));
        } else {
          reloadForVaultUser();
        }
        scheduleSessionSync(true);
      });
    };
    const onDataBoxSession = () => {
      void resolveVaultUserId().then((uid) => {
        if (uid && uid !== vaultUserIdRef.current) {
          vaultUserIdRef.current = uid;
          applyAccounts(loadDedupedAccounts(uid));
          scheduleSessionSync(true);
          return;
        }
        const userChanged = reloadForVaultUser();
        scheduleSessionSync(userChanged || Boolean(uid));
      });
    };
    window.addEventListener("p0020:twofa-session", onTwofaSession);
    window.addEventListener("p0020:databox-session", onDataBoxSession);

    const onFocus = () => void syncFromCloud({ silent: true, reconcile: true });
    window.addEventListener("focus", onFocus);

    const boot = async () => {
      const uid = await resolveVaultUserId();
      if (uid) {
        if (uid !== vaultUserIdRef.current) {
          vaultUserIdRef.current = uid;
          applyAccounts(loadDedupedAccounts(uid));
        } else {
          reloadForVaultUser();
        }
        // Full cloud pull on every browser boot — localStorage is per-browser.
        scheduleSessionSync(true);
      } else {
        reloadForVaultUser();
      }
    };
    const idleId =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(() => void boot(), { timeout: 2500 })
        : window.setTimeout(() => void boot(), 150);

    return () => {
      window.removeEventListener("p0020:twofa-session", onTwofaSession);
      window.removeEventListener("p0020:databox-session", onDataBoxSession);
      window.removeEventListener("focus", onFocus);
      window.clearTimeout(sessionSyncTimer);
      if (typeof idleId === "number") window.clearTimeout(idleId);
      else window.cancelIdleCallback(idleId);
    };
  }, [applyAccounts, reloadForVaultUser, resolveVaultUserId, syncFromCloud]);

  const remapLocalId = useCallback((localId: string, cloudId: string) => {
    if (localId === cloudId) return;
    applyAccounts(accountsRef.current.map((row) => (row.id === localId ? { ...row, id: cloudId } : row)));
  }, [applyAccounts]);

  const cloudUpsert = useCallback(
    async (account: TwofaAccount) => {
      if (!isTwofaCloudAvailable()) return;
      const { error, cloudId } = await upsertTwofaCloud(account);
      if (error) {
        setCloudState("error");
        setCloudError(error);
        return;
      }
      if (cloudId && cloudId !== account.id) remapLocalId(account.id, cloudId);
    },
    [remapLocalId],
  );

  const cloudDelete = useCallback(async (id: string) => {
    if (!isTwofaCloudAvailable()) return;
    const err = await deleteTwofaCloud(id);
    if (err) {
      setCloudState("error");
      setCloudError(err);
    }
  }, []);

  const addMany = useCallback(
    (drafts: TwofaDraft[]): TwofaAddManyResult => {
      const now = new Date().toISOString();
      const cloudRows: TwofaAccount[] = [];
      const cloudRemovals: string[] = [];
      let next = accountsRef.current;
      let added = 0;
      let replaced = 0;

      for (const draft of drafts) {
        const outcome = upsertTwofaDraft(next, draft, now);
        if (!outcome) continue;
        next = outcome.accounts;
        if (outcome.replaced) replaced += 1;
        else added += 1;
        cloudRows.push(outcome.row);
        cloudRemovals.push(...outcome.removedIds);
      }

      applyAccounts(next);
      for (const row of cloudRows) void cloudUpsert(row);
      for (const removedId of cloudRemovals) void cloudDelete(removedId);
      return { added, replaced, total: added + replaced };
    },
    [applyAccounts, cloudDelete, cloudUpsert],
  );

  const add = useCallback(
    (draft: TwofaDraft): TwofaSaveResult => {
      const now = new Date().toISOString();
      const outcome = upsertTwofaDraft(accountsRef.current, draft, now);
      if (!outcome) return { ok: false };
      applyAccounts(outcome.accounts);
      void cloudUpsert(outcome.row);
      for (const removedId of outcome.removedIds) void cloudDelete(removedId);
      return { ok: true, replaced: outcome.replaced };
    },
    [applyAccounts, cloudDelete, cloudUpsert],
  );

  const update = useCallback(
    (id: string, draft: TwofaDraft) => {
      const now = new Date().toISOString();
      const outcome = updateTwofaDraft(accountsRef.current, id, draft, now);
      if (!outcome) return false;
      applyAccounts(outcome.accounts);
      void cloudUpsert(outcome.row);
      for (const removedId of outcome.removedIds) void cloudDelete(removedId);
      return true;
    },
    [applyAccounts, cloudDelete, cloudUpsert],
  );

  const remove = useCallback(
    (id: string) => {
      const run = async () => {
        markTwofaPendingDelete(id);
        syncGeneration.current += 1;
        applyAccounts(accountsRef.current.filter((a) => a.id !== id));
        if (isTwofaCloudAvailable()) {
          const err = await deleteTwofaCloud(id);
          if (err) {
            setCloudState("error");
            setCloudError(err);
            return;
          }
        }
      };
      void run();
    },
    [applyAccounts],
  );

  const touchLastUsed = useCallback(
    (id: string) => {
      const now = new Date().toISOString();
      const next = accountsRef.current.map((a) => {
        if (a.id !== id) return a;
        const row = { ...a, lastUsedAt: now, updatedAt: now };
        void cloudUpsert(row);
        return row;
      });
      applyAccounts(next);
    },
    [applyAccounts, cloudUpsert],
  );

  const dedupeNow = useCallback((): number => {
    const { accounts: deduped, removedIds } = dedupeTwofaAccounts(accountsRef.current);
    applyAccounts(deduped);
    for (const removedId of removedIds) void cloudDelete(removedId);
    return removedIds.length;
  }, [applyAccounts, cloudDelete]);

  return {
    accounts,
    tick,
    add,
    addMany,
    update,
    remove,
    touchLastUsed,
    dedupeNow,
    cloudState,
    cloudError,
    fullSyncNotice,
    ackFullSyncNotice,
    syncFromCloud,
  };
}
