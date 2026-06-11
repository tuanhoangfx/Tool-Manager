import { readTwofaSession } from "../../lib/twofa-session";
import type { TwofaAccount } from "./types";

export const TWOFA_LEGACY_STORAGE_KEY = "p0020-twofa-accounts-v1";
export const TWOFA_STORAGE_KEY_PREFIX = "p0020-twofa-accounts-v2";

const LEGACY_STORAGE_KEY = TWOFA_LEGACY_STORAGE_KEY;
const STORAGE_KEY_PREFIX = TWOFA_STORAGE_KEY_PREFIX;

export function twofaVaultStorageKey(userId: string | null | undefined): string {
  return userId ? `${STORAGE_KEY_PREFIX}:${userId}` : LEGACY_STORAGE_KEY;
}

function storageKey(userId: string | null | undefined): string {
  return twofaVaultStorageKey(userId);
}

export function getTwofaStorageUserId(): string | null {
  return readTwofaSession()?.user_id ?? null;
}

function readKey(key: string): TwofaAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TwofaAccount[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeKey(key: string, accounts: TwofaAccount[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(accounts));
}

const LEGACY_MIGRATED_TO_KEY = "p0020-twofa-legacy-migrated-to";

/** Migrate pre-sync local vault into the first signed-in user's scoped cache (once). */
function migrateLegacyAccounts(userId: string): TwofaAccount[] {
  const legacy = readKey(LEGACY_STORAGE_KEY);
  if (!legacy.length) return [];
  const scoped = readKey(storageKey(userId));
  if (scoped.length) return scoped;
  try {
    const claimed = localStorage.getItem(LEGACY_MIGRATED_TO_KEY);
    if (claimed && claimed !== userId) return [];
    writeKey(storageKey(userId), legacy);
    localStorage.setItem(LEGACY_MIGRATED_TO_KEY, userId);
    return legacy;
  } catch {
    return [];
  }
}

export function loadAccounts(userId?: string | null): TwofaAccount[] {
  const uid = userId ?? getTwofaStorageUserId();
  if (uid) {
    const scoped = readKey(storageKey(uid));
    if (scoped.length) return scoped;
    return migrateLegacyAccounts(uid);
  }
  return readKey(LEGACY_STORAGE_KEY);
}

export function saveAccounts(accounts: TwofaAccount[], userId?: string | null) {
  const uid = userId ?? getTwofaStorageUserId();
  writeKey(storageKey(uid), accounts);
}

export function newId() {
  return crypto.randomUUID();
}
