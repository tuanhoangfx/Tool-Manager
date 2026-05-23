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

  const add = useCallback((draft: TwofaDraft) => {
    const service = draft.service.trim();
    const account = draft.account.trim();
    const secret = normalizeSecret(draft.secret);
    if (!service || !account || !secret) return false;
    const now = new Date().toISOString();
    setAccounts((prev) => [
      ...prev,
      { id: newId(), service, account, secret, createdAt: now, updatedAt: now },
    ]);
    return true;
  }, []);

  const update = useCallback((id: string, draft: TwofaDraft) => {
    const service = draft.service.trim();
    const account = draft.account.trim();
    const secret = normalizeSecret(draft.secret);
    if (!service || !account || !secret) return false;
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, service, account, secret, updatedAt: new Date().toISOString() } : a,
      ),
    );
    return true;
  }, []);

  const remove = useCallback((id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return { accounts, tick, add, update, remove };
}
