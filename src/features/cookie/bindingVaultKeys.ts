import type { CookieBinding } from "./cookieBridge";

/** Stable key for vault REST queries — only enabled routes with noteId. */
export function bindingVaultQueryKey(bindings: CookieBinding[]): string {
  const pairs = bindings
    .filter((b) => b.enabled && b.noteId?.trim())
    .map((b) => `${b.noteId.trim()}:${b.domain.trim()}`)
    .sort();
  return pairs.join("|");
}
