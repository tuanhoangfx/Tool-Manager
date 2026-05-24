declare module "@p0020/bridge/protocol" {
  export const BRIDGE_MSG: {
    readonly AUTH: string;
    readonly BINDINGS: string;
    readonly PREFS: string;
    readonly SYNC: string;
    readonly SELECT: string;
  };
  export const TOOL_ORIGINS: Set<string>;
  export function isAllowedToolOrigin(origin: string): boolean;
  export const TOOL_COOKIE_URL_LOCAL: string;
  export const TOOL_COOKIE_URL_PROD: string;
}

declare module "@p0020/bridge/normalize-domain" {
  export function normalizeCookieDomain(input: string): string | null;
}

declare module "@p0020/bridge/vault-crypto" {
  export const VAULT_VERSION: number;
  export const PBKDF2_ITERATIONS: number;
  export function encryptVaultPayload(
    passphrase: string,
    noteId: string,
    domain: string,
    cookies: object[],
    serializeFn?: (cookies: object[]) => string,
  ): Promise<{ ciphertext: string; iv: string; cookieCount: number }>;
  export function decryptVaultPayload(
    passphrase: string,
    noteId: string,
    domain: string,
    ciphertextB64: string,
    ivB64: string,
    serializeFn?: (cookies: object[]) => string,
  ): Promise<object[]>;
}
