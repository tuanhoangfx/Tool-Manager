/** AES-256-GCM vault — passphrase + noteId + domain salt (Tool + extension). */

export const VAULT_VERSION = 1;
export const PBKDF2_ITERATIONS = 120_000;

function enc(s) {
  return new TextEncoder().encode(s);
}

function toB64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function fromB64(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function deriveAesKey(passphrase, noteId, domain) {
  const pass = passphrase ?? "";
  const keyMaterial = await crypto.subtle.importKey("raw", enc(pass), "PBKDF2", false, ["deriveKey"]);
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

function defaultSerialize(cookies) {
  return JSON.stringify({ v: VAULT_VERSION, cookies });
}

/**
 * @param {object[]} cookies
 * @param {(cookies: object[]) => string} [serializeFn]
 */
export async function encryptVaultPayload(passphrase, noteId, domain, cookies, serializeFn) {
  const serialize = serializeFn ?? defaultSerialize;
  const key = await deriveAesKey(passphrase, noteId, domain);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = enc(serialize(cookies));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain);
  return {
    ciphertext: toB64(cipher),
    iv: toB64(iv.buffer),
    cookieCount: cookies.length,
  };
}

export async function decryptVaultPayload(
  passphrase,
  noteId,
  domain,
  ciphertextB64,
  ivB64,
  serializeFn,
) {
  const key = await deriveAesKey(passphrase, noteId, domain);
  const iv = new Uint8Array(fromB64(ivB64));
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, fromB64(ciphertextB64));
  const parsed = JSON.parse(new TextDecoder().decode(plain));
  return parsed.cookies ?? [];
}

export function vaultPassphrase(binding) {
  return binding?.pass ?? "";
}

export function canUseVault(binding) {
  return Boolean(binding?.noteId?.trim());
}
