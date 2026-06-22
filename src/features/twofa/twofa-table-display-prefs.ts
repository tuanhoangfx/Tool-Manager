const MASK_PASSWORD_KEY = "p0020:twofa-mask-password-table";

export const TWOFA_TABLE_DISPLAY_CHANGE_EVENT = "twofa-table-display-change";

export function readTwofaMaskPasswordInTable(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(MASK_PASSWORD_KEY);
    if (raw === null) return true;
    return raw === "1";
  } catch {
    return true;
  }
}

export function readTwofaShowPasswordInTable(): boolean {
  return !readTwofaMaskPasswordInTable();
}

export function writeTwofaMaskPasswordInTable(mask: boolean) {
  window.localStorage.setItem(MASK_PASSWORD_KEY, mask ? "1" : "0");
  window.dispatchEvent(new CustomEvent(TWOFA_TABLE_DISPLAY_CHANGE_EVENT));
}

export function writeTwofaShowPasswordInTable(show: boolean) {
  writeTwofaMaskPasswordInTable(!show);
}
