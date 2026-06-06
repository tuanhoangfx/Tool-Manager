import { useCallback, useEffect, useState } from "react";
import { loadAccounts, newId, saveAccounts } from "./storage";
import type { TwofaAccount, TwofaDraft } from "./types";
import { normalizeSecret } from "./totp";
import {
  deleteTwofaCloud,
  isTwofaCloudAvailable,
  runTwofaCloudSync,
  upsertTwofaCloud,
  type TwofaCloudSyncState,
} from "./twofa-cloud-sync";

export function useTwofaAccounts() {
  const [accounts, setAccounts] = useState<TwofaAccount[]>(() => loadAccounts());
  const [tick, setTick] = useState(0);
  const [cloudState, setCloudState] = useState<TwofaCloudSyncState>(
    isTwofaCloudAvailable() ? "idle" : "off",
  );
  const [cloudError, setCloudError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => saveAccounts(accounts), 280);
    return () => window.clearTimeout(timer);
  }, [accounts]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const syncFromCloud = useCallback(async () => {
    if (!isTwofaCloudAvailable()) return;
    setCloudState("syncing");
    setCloudError(null);
    const local = loadAccounts();
    const { accounts: merged, error } = await runTwofaCloudSync(local);
    if (error) {
      setCloudState("error");
      setCloudError(error);
      return;
    }
    setAccounts(merged);
    setCloudState("ok");
  }, []);

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

  const cloudUpsert = useCallback(async (account: TwofaAccount) => {
    if (!isTwofaCloudAvailable()) return;
    const err = await upsertTwofaCloud(account);
    if (err) {
      setCloudState("error");
      setCloudError(err);
    }
  }, []);

  const cloudDelete = useCallback(async (id: string) => {
    if (!isTwofaCloudAvailable()) return;
    const err = await deleteTwofaCloud(id);
    if (err) {
      setCloudState("error");
      setCloudError(err);
    }
  }, []);

  const addMany = useCallback(
    (drafts: TwofaDraft[]) => {
      const now = new Date().toISOString();
      const next: TwofaAccount[] = [];
      let added = 0;
      for (const draft of drafts) {
        const service = draft.service.trim();
        const account = draft.account.trim();
        const secret = normalizeSecret(draft.secret);
        const password = draft.password?.trim();
        if (!secret) continue;
        const row: TwofaAccount = {
          id: newId(),
          service,
          account,
          ...(password ? { password } : {}),
          secret,
          createdAt: now,
          updatedAt: now,
        };
        next.push(row);
        void cloudUpsert(row);
        added += 1;
      }
      if (!next.length) return { added: 0 };
      setAccounts((prev) => [...prev, ...next]);
      return { added };
    },
    [cloudUpsert],
  );

  const add = useCallback(
    (draft: TwofaDraft) => {
      const service = draft.service.trim();
      const account = draft.account.trim();
      const secret = normalizeSecret(draft.secret);
      const password = draft.password?.trim();
      if (!secret) return false;
      const now = new Date().toISOString();
      const row: TwofaAccount = {
        id: newId(),
        service,
        account,
        ...(password ? { password } : {}),
        secret,
        createdAt: now,
        updatedAt: now,
      };
      setAccounts((prev) => [...prev, row]);
      void cloudUpsert(row);
      return true;
    },
    [cloudUpsert],
  );

  const update = useCallback(
    (id: string, draft: TwofaDraft) => {
      const service = draft.service.trim();
      const account = draft.account.trim();
      const secret = normalizeSecret(draft.secret);
      const password = draft.password?.trim();
      if (!secret) return false;
      const now = new Date().toISOString();
      let updated: TwofaAccount | null = null;
      setAccounts((prev) =>
        prev.map((a) => {
          if (a.id !== id) return a;
          const next: TwofaAccount = {
            ...a,
            service,
            account,
            secret,
            updatedAt: now,
          };
          if (password) next.password = password;
          else delete next.password;
          updated = next;
          return next;
        }),
      );
      if (updated) void cloudUpsert(updated);
      return true;
    },
    [cloudUpsert],
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

  return {
    accounts,
    tick,
    add,
    addMany,
    update,
    remove,
    touchLastUsed,
    cloudState,
    cloudError,
    syncFromCloud,
  };
}
