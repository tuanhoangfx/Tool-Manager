import type { TwofaAccount } from "./types";

const STORAGE_KEY = "p0020-twofa-accounts-v1";

export function loadAccounts(): TwofaAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TwofaAccount[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAccounts(accounts: TwofaAccount[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

export function newId() {
  return crypto.randomUUID();
}
