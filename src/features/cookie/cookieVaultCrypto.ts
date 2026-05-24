/** Client-side vault crypto — @p0020/bridge (same algorithm as extension). */
import {
  decryptVaultPayload as decryptCore,
  encryptVaultPayload as encryptCore,
} from "@p0020/bridge/vault-crypto";

export type VaultCookie = {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: string;
  expirationDate?: number | null;
  storeId?: string | null;
};

export async function encryptVaultPayload(
  passphrase: string,
  noteId: string,
  domain: string,
  cookies: VaultCookie[],
) {
  return encryptCore(passphrase, noteId, domain, cookies);
}

export async function decryptVaultPayload(
  passphrase: string,
  noteId: string,
  domain: string,
  ciphertextB64: string,
  ivB64: string,
): Promise<VaultCookie[]> {
  return decryptCore(passphrase, noteId, domain, ciphertextB64, ivB64) as Promise<VaultCookie[]>;
}
