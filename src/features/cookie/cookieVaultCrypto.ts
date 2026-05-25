/** Client-side vault crypto (same algorithm as E0001-cookie-bridge extension). */

const VAULT_VERSION = 1;
const PBKDF2_ITERATIONS = 120_000;

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

function enc(s: string) {
  return new TextEncoder().encode(s);
}

function toB64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function fromB64(b64: string) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function deriveAesKey(passphrase: string, noteId: string, domain: string) {
  const keyMaterial = await crypto.subtle.importKey("raw", enc(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc(`p0020-vault-v${VAULT_VERSION}:${noteId}:${domain}`),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function serializeCookies(cookies: VaultCookie[]) {
  return JSON.stringify({ v: VAULT_VERSION, cookies });
}

export async function encryptVaultPayload(
  passphrase: string,
  noteId: string,
  domain: string,
  cookies: VaultCookie[],
) {
  const key = await deriveAesKey(passphrase, noteId, domain);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = enc(serializeCookies(cookies));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain);
  return {
    ciphertext: toB64(cipher),
    iv: toB64(iv.buffer),
    cookieCount: cookies.length,
  };
}

export async function decryptVaultPayload(
  passphrase: string,
  noteId: string,
  domain: string,
  ciphertextB64: string,
  ivB64: string,
): Promise<VaultCookie[]> {
  const key = await deriveAesKey(passphrase, noteId, domain);
  const iv = new Uint8Array(fromB64(ivB64));
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, fromB64(ciphertextB64));
  const parsed = JSON.parse(new TextDecoder().decode(plain)) as { cookies?: VaultCookie[] };
  return parsed.cookies ?? [];
}
