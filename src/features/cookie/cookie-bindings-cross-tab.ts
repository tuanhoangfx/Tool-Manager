import { createCrossTabSync } from "@dev/hub-load";

export const COOKIE_BINDINGS_CHANNEL = "p0020-cookie-bindings-sync";
export const COOKIE_BINDINGS_STORAGE_KEY = "e0001-cookie-bindings-v1";
export const COOKIE_SELECTED_BINDING_STORAGE_KEY = "e0001-selected-binding-id";

const cookieBindingsCrossTab = createCrossTabSync({
  channelName: COOKIE_BINDINGS_CHANNEL,
  matchesStorageKey: cookieBindingsStorageMatcher,
});

export function cookieBindingsStorageMatcher(key: string): boolean {
  return key === COOKIE_BINDINGS_STORAGE_KEY || key === COOKIE_SELECTED_BINDING_STORAGE_KEY;
}

export function postCookieBindingsCrossTab(type = "local-updated"): void {
  cookieBindingsCrossTab.post(type, null);
}
