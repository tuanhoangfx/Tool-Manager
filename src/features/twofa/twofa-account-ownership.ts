import type { FilterOption } from "@tool-workspace/hub-ui";
import type { TwofaAccount } from "./types";

export const TWOFA_ACCOUNT_OWNERSHIP_OPTIONS = [
  { id: "czp", emoji: "🦸‍♂️", label: "CzP" },
  { id: "buyer", emoji: "🤵", label: "Buyer" },
  { id: "ready", emoji: "🧰", label: "Ready" },
  { id: "appeal", emoji: "🚨", label: "Appeal" },
  { id: "usable", emoji: "🔋", label: "Usable" },
  { id: "rent", emoji: "💳", label: "Rent" },
  { id: "sell", emoji: "💰", label: "Sell" },
  { id: "give", emoji: "🎁", label: "Give" },
  { id: "resell", emoji: "🚚", label: "Resell" },
  { id: "storage", emoji: "💾", label: "Storage" },
  { id: "undefined", emoji: "❓", label: "Undefined" },
] as const;

export type TwofaAccountOwnership = (typeof TWOFA_ACCOUNT_OWNERSHIP_OPTIONS)[number]["id"];

export const DEFAULT_TWOFA_ACCOUNT_OWNERSHIP: TwofaAccountOwnership = "undefined";

const OWNERSHIP_IDS = new Set<string>(TWOFA_ACCOUNT_OWNERSHIP_OPTIONS.map((item) => item.id));

const OWNERSHIP_BY_ID = Object.fromEntries(
  TWOFA_ACCOUNT_OWNERSHIP_OPTIONS.map((item) => [item.id, item]),
) as Record<TwofaAccountOwnership, (typeof TWOFA_ACCOUNT_OWNERSHIP_OPTIONS)[number]>;

/** Sheet / legacy note label → ownership id. */
const SHEET_OWNERSHIP_ALIASES: Record<string, TwofaAccountOwnership> = {
  czp: "czp",
  buyer: "buyer",
  ready: "ready",
  appeal: "appeal",
  usable: "usable",
  rent: "rent",
  sell: "sell",
  give: "give",
  resell: "resell",
  storage: "storage",
  undefined: "undefined",
};

function stripEmojiPrefix(raw: string): string {
  return raw.replace(/^[\p{Extended_Pictographic}\uFE0F\s]+/gu, "").trim();
}

export function normalizeTwofaAccountOwnership(value: unknown): TwofaAccountOwnership {
  if (typeof value === "string") {
    const key = value.trim().toLowerCase();
    if (OWNERSHIP_IDS.has(key)) return key as TwofaAccountOwnership;
    const stripped = stripEmojiPrefix(value).toLowerCase();
    if (SHEET_OWNERSHIP_ALIASES[stripped]) return SHEET_OWNERSHIP_ALIASES[stripped];
    for (const [alias, id] of Object.entries(SHEET_OWNERSHIP_ALIASES)) {
      if (stripped.includes(alias)) return id;
    }
  }
  return DEFAULT_TWOFA_ACCOUNT_OWNERSHIP;
}

export function parseOwnershipFromSheetLabel(raw: string): TwofaAccountOwnership {
  return normalizeTwofaAccountOwnership(stripEmojiPrefix(raw) || raw);
}

const OWNERSHIP_NOTE_RE = /^Ownership:\s*.+?(?:\r?\n|$)/m;

/** Remove legacy `Ownership: …` line from imported notes. */
export function stripOwnershipLineFromNote(note: string | undefined): string {
  const trimmed = note?.trim() ?? "";
  if (!trimmed) return "";
  return trimmed.replace(OWNERSHIP_NOTE_RE, "").trim();
}

export function parseOwnershipFromNote(note: string | undefined): TwofaAccountOwnership | null {
  const trimmed = note?.trim() ?? "";
  if (!trimmed) return null;
  const match = trimmed.match(/^Ownership:\s*(.+?)(?:\r?\n|$)/m);
  if (!match?.[1]) return null;
  return parseOwnershipFromSheetLabel(match[1]);
}

export function resolveTwofaAccountOwnership(
  ownership: unknown,
  note?: string,
): TwofaAccountOwnership {
  if (typeof ownership === "string" && ownership.trim() && ownership !== DEFAULT_TWOFA_ACCOUNT_OWNERSHIP) {
    return normalizeTwofaAccountOwnership(ownership);
  }
  const fromNote = parseOwnershipFromNote(note);
  if (fromNote) return fromNote;
  if (typeof ownership === "string" && ownership.trim()) {
    return normalizeTwofaAccountOwnership(ownership);
  }
  return DEFAULT_TWOFA_ACCOUNT_OWNERSHIP;
}

export function formatTwofaAccountOwnership(ownership: TwofaAccountOwnership): string {
  const item = OWNERSHIP_BY_ID[ownership];
  return `${item.emoji} ${item.label}`;
}

export function twofaOwnershipFilterOptions(): FilterOption[] {
  return TWOFA_ACCOUNT_OWNERSHIP_OPTIONS.map((item) => ({
    value: item.id,
    label: item.label,
    emoji: item.emoji,
  }));
}

export function normalizeTwofaAccountOwnershipField(row: TwofaAccount): TwofaAccount {
  const ownership = resolveTwofaAccountOwnership(row.ownership, row.note);
  const note = stripOwnershipLineFromNote(row.note);
  return {
    ...row,
    ownership,
    ...(note ? { note } : {}),
  };
}
