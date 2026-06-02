import type { TwofaAccount } from "./types";

/** Prefer dedicated last-used timestamp when present; fall back to updatedAt. */
export function twofaActivityAt(account: TwofaAccount): string {
  return account.lastUsedAt?.trim() || account.updatedAt;
}

export function formatLastUsed(iso: string | undefined): string {
  if (!iso?.trim()) return "—";
  const at = new Date(iso).getTime();
  if (Number.isNaN(at)) return "—";
  const diffMs = Date.now() - at;
  if (diffMs < 60_000) return "Just now";
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
