const COOLDOWN_MS = 8_000;
let lastLinkToastAt = 0;

/** Avoid duplicate “Extension runtime linked” toasts (Strict Mode, tab switch, F5). */
export function shouldShowExtensionLinkToast(): boolean {
  const now = Date.now();
  if (now - lastLinkToastAt < COOLDOWN_MS) return false;
  lastLinkToastAt = now;
  return true;
}
