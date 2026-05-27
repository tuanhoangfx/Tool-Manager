export type CookieSourceLockState = "source_unset" | "read_only" | "source";

export function getCookieSourceLockState(sourceBrowserId: string | null | undefined, browserId: string) {
  const locked = sourceBrowserId?.trim() ?? "";
  if (!locked) {
    return { canWrite: false, state: "source_unset" as CookieSourceLockState };
  }
  if (locked !== browserId) {
    return { canWrite: false, state: "read_only" as CookieSourceLockState };
  }
  return { canWrite: true, state: "source" as CookieSourceLockState };
}
