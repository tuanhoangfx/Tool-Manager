import { useCallback, useEffect, useRef, useState } from "react";
import { loadAccounts, saveAccounts } from "./storage";
import type { TwofaAccount, TwofaDraft } from "./types";
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
  type TwofaUpsertOutcome,
} from "./twofa-upsert-accounts";
import { useTwofaRealtime } from "./useTwofaRealtime";

export type TwofaCloudSyncOpts = { /** Skip syncing badge — use for realtime refresh */ silent?: boolean };

export type TwofaAddManyResult = {
  added: number;
  replaced: number;
  total: number;
};

export type TwofaSaveResult = { ok: true; replaced: boolean } | { ok: false };

export function useTwofaAccounts() {
  const [accounts, setAccounts] = useState<TwofaAccount[]>(() => {
    const loaded = loadAccounts();
    const { accounts: deduped, removedIds } = dedupeTwofaAccounts(loaded);
    if (removedIds.length) saveAccounts(deduped);
    return deduped;
  });
  const [tick, setTick] = useState(0);
  const [cloudState, setCloudState] = useState<TwofaCloudSyncState>(
    isTwofaCloudAvailable() ? "idle" : "off",
  );
  const [cloudError, setCloudError] = useState<string | null>(null);
  const syncInFlight = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => saveAccounts(accounts), 280);
    return () => window.clearTimeout(timer);
  }, [accounts]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const syncFromCloud = useCallback(async (opts?: TwofaCloudSyncOpts) => {
    if (!isTwofaCloudAvailable() || syncInFlight.current) return;
    syncInFlight.current = true;
    const silent = opts?.silent ?? false;
    if (!silent) {
      setCloudState("syncing");
      setCloudError(null);
    }
    try {
      const local = loadAccounts();
      const { accounts: merged, error } = await runTwofaCloudSync(local);
      if (error) {
        setCloudState("error");
        setCloudError(error);
        return;
      }
      const { accounts: deduped } = dedupeTwofaAccounts(merged);
      setAccounts(deduped);
      setCloudState("ok");
    } finally {
      syncInFlight.current = false;
    }
  }, []);

  const syncFromRealtime = useCallback(() => {
    void syncFromCloud({ silent: true });
  }, [syncFromCloud]);

  useTwofaRealtime(syncFromRealtime, isTwofaCloudAvailable());

  useEffect(() => {
    if (!isTwofaCloudAvailable()) return;

    const onSession = () => {
      void syncFromCloud();
    };
    window.addEventListener("p0020:twofa-session", onSession);
    window.addEventListener("p0020:databox-session", onSession);
    void syncFromCloud();

    return () => {
      window.removeEventListener("p0020:twofa-session", onSession);
      window.removeEventListener("p0020:databox-session", onSession);
    };
  }, [syncFromCloud]);

  const remapLocalId = useCallback((localId: string, cloudId: string) => {
    if (localId === cloudId) return;
    setAccounts((prev) => prev.map((row) => (row.id === localId ? { ...row, id: cloudId } : row)));
  }, []);

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
      let result: TwofaAddManyResult = { added: 0, replaced: 0, total: 0 };

      setAccounts((prev) => {
        let next = prev;
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
        result = { added, replaced, total: added + replaced };
        return next;
      });

      for (const row of cloudRows) void cloudUpsert(row);
      for (const removedId of cloudRemovals) void cloudDelete(removedId);
      return result;
    },
    [cloudDelete, cloudUpsert],
  );

  const add = useCallback(
    (draft: TwofaDraft): TwofaSaveResult => {
      const now = new Date().toISOString();
      const result: { outcome?: TwofaUpsertOutcome } = {};
      setAccounts((prev) => {
        const outcome = upsertTwofaDraft(prev, draft, now);
        if (!outcome) return prev;
        result.outcome = outcome;
        return outcome.accounts;
      });
      if (!result.outcome) return { ok: false };
      void cloudUpsert(result.outcome.row);
      for (const removedId of result.outcome.removedIds) void cloudDelete(removedId);
      return { ok: true, replaced: result.outcome.replaced };
    },
    [cloudDelete, cloudUpsert],
  );

  const update = useCallback(
    (id: string, draft: TwofaDraft) => {
      const now = new Date().toISOString();
      const result: { outcome?: TwofaUpsertOutcome } = {};
      setAccounts((prev) => {
        const outcome = updateTwofaDraft(prev, id, draft, now);
        if (!outcome) return prev;
        result.outcome = outcome;
        return outcome.accounts;
      });
      if (!result.outcome) return false;
      void cloudUpsert(result.outcome.row);
      for (const removedId of result.outcome.removedIds) void cloudDelete(removedId);
      return true;
    },
    [cloudDelete, cloudUpsert],
  );

  const remove = useCallback(
    (id: string) => {
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      void cloudDelete(id);
    },
    [cloudDelete],
  );

  const touchLastUsed = useCallback(
    (id: string) => {
      const now = new Date().toISOString();
      setAccounts((prev) =>
        prev.map((a) => {
          if (a.id !== id) return a;
          const next = { ...a, lastUsedAt: now, updatedAt: now };
          void cloudUpsert(next);
          return next;
        }),
      );
    },
    [cloudUpsert],
  );

  const dedupeNow = useCallback((): number => {
    const cloudRemovals: string[] = [];
    let removed = 0;
    setAccounts((prev) => {
      const { accounts: deduped, removedIds } = dedupeTwofaAccounts(prev);
      removed = removedIds.length;
      cloudRemovals.push(...removedIds);
      return deduped;
    });
    for (const removedId of cloudRemovals) void cloudDelete(removedId);
    return removed;
  }, [cloudDelete]);

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
    syncFromCloud,
  };
}
