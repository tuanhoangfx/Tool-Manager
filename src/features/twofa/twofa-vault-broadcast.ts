import { createCrossTabSync } from "@dev/hub-load";
import {
  TWOFA_LEGACY_STORAGE_KEY,
  TWOFA_STORAGE_KEY_PREFIX,
} from "./storage";

export const TWOFA_VAULT_CHANNEL = "p0020-twofa-vault-sync";

const vaultCrossTab = createCrossTabSync({
  channelName: TWOFA_VAULT_CHANNEL,
  matchesStorageKey: (key) =>
    key === TWOFA_LEGACY_STORAGE_KEY || key.startsWith(`${TWOFA_STORAGE_KEY_PREFIX}:`),
});

export type TwofaVaultBroadcastType = "local-updated" | "cloud-synced";

export function postTwofaVaultBroadcast(
  msg: { type: TwofaVaultBroadcastType; userId: string | null },
): void {
  vaultCrossTab.post(msg.type, msg.userId);
}

export function twofaVaultStorageMatcher(key: string): boolean {
  return key === TWOFA_LEGACY_STORAGE_KEY || key.startsWith(`${TWOFA_STORAGE_KEY_PREFIX}:`);
}
