import { useCallback, useEffect, useState } from "react";
import { loadAccounts, newId, saveAccounts } from "./storage";
import type { TwofaAccount, TwofaDraft } from "./types";
import { normalizeSecret } from "./totp";

export function useTwofaAccounts() {
  const [accounts, setAccounts] = useState<TwofaAccount[]>(() => loadAccounts());
  const [tick, setTick] = useState(0);

  useEffect(() => {
    saveAccounts(accounts);
  }, [accounts]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const addMany = useCallback((drafts: TwofaDraft[]) => {
    const now = new Date().toISOString();
    const next: TwofaAccount[] = [];
    let added = 0;
    for (const draft of drafts) {
      const service = draft.service.trim();
      const account = draft.account.trim();
      const secret = normalizeSecret(draft.secret);
      const password = draft.password?.trim();
      if (!service || !account || !secret) continue;
      next.push({
        id: newId(),
        service,
        account,
        ...(password ? { password } : {}),
        secret,
        createdAt: now,
        updatedAt: now,
      });
      added += 1;
    }
    if (!next.length) return { added: 0 };
    setAccounts((prev) => [...prev, ...next]);
    return { added };
  }, []);

  const add = useCallback((draft: TwofaDraft) => {
    const service = draft.service.trim();
    const account = draft.account.trim();
    const secret = normalizeSecret(draft.secret);
    const password = draft.password?.trim();
    if (!service || !account || !secret) return false;
    const now = new Date().toISOString();
    setAccounts((prev) => [
      ...prev,
      {
        id: newId(),
        service,
        account,
        ...(password ? { password } : {}),
        secret,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    return true;
  }, []);

  const update = useCallback((id: string, draft: TwofaDraft) => {
    const service = draft.service.trim();
    const account = draft.account.trim();
    const secret = normalizeSecret(draft.secret);
    const password = draft.password?.trim();
    if (!service || !account || !secret) return false;
    setAccounts((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const next: TwofaAccount = {
          ...a,
          service,
          account,
          secret,
          updatedAt: new Date().toISOString(),
        };
        if (password) next.password = password;
        else delete next.password;
        return next;
      }),
    );
    return true;
  }, []);

  const remove = useCallback((id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const touchLastUsed = useCallback((id: string) => {
    const now = new Date().toISOString();
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, lastUsedAt: now, updatedAt: now } : a)),
    );
  }, []);

  return { accounts, tick, add, addMany, update, remove, touchLastUsed };
}
