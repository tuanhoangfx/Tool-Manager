/** Cookie bridge ↔ E0001-cookie-bridge extension (postMessage + local prefs). */

export { normalizeCookieDomain } from "./normalizeCookieDomain";

export type CookieBinding = {
  id: string;
  noteId: string;
  syncId: string;
  /** When true, extension calls note_sync_cookies_by_note_id */
  useNoteIdRpc?: boolean;
  domain: string;
  /** Plain pass — stored locally + extension only; never sent to Supabase from here */
  pass?: string;
  /** True when target note has sync_pass_hash — vault requires pass on binding */
  requiresPass?: boolean;
  noteTitle?: string;
  /** Browser allowed to publish/promote vault versions for this route. Targets are read-only. */
  sourceBrowserId?: string | null;
  sourceLabel?: string | null;
  ownerUserId?: string | null;
  ownerUserEmail?: string | null;
  accessRole?: "owner" | "member";
  canApply?: boolean;
  canPublish?: boolean;
  canManage?: boolean;
  enabled: boolean;
};

export type CookieBridgeRole = "writer" | "reader";

export type CookieBridgePrefs = {
  syncIntervalMinutes: number;
  realtimeSync: boolean;
  /** Upload AES-GCM encrypted cookie jar to note_cookie_vault (requires sync pass on binding) */
  vaultSync: boolean;
  /** Extension applies remote vault via Realtime + poll (opt-in — writes cookies to this browser) */
  realtimeVaultApply: boolean;
  /** Legacy local label. Effective write permission comes from owner/member route access. */
  bridgeRole: CookieBridgeRole;
};

const BINDINGS_KEY = "e0001-cookie-bindings-v1";
const PREFS_KEY = "e0001-cookie-bridge-prefs-v1";
const SELECTED_BINDING_KEY = "e0001-selected-binding-id";

function purgeLegacyCookieBridgeStorage() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("p0020-cookie-bindings-v1");
  localStorage.removeItem("p0020-cookie-bridge-prefs-v1");
  localStorage.removeItem("p0020-selected-binding-id");
}

export const DOMAIN_PRESETS: { label: string; domain: string }[] = [
  { label: "Zalo", domain: ".zalo.me" },
  { label: "Facebook", domain: ".facebook.com" },
  { label: "Google", domain: ".google.com" },
  { label: "GitHub", domain: ".github.com" },
  { label: "Supabase", domain: ".supabase.co" },
  { label: "Vercel", domain: ".vercel.app" },
];

/** Binding hợp lệ: có domain + (syncId HOẶC noteId / UUID mode) */
export function isValidCookieBinding(b: CookieBinding): boolean {
  return Boolean(
    b.domain?.trim() &&
      (b.syncId?.trim() || b.noteId?.trim() || b.useNoteIdRpc),
  );
}

export function loadCookieBindings(): CookieBinding[] {
  if (typeof window === "undefined") return [];
  try {
    purgeLegacyCookieBridgeStorage();
    const raw = localStorage.getItem(BINDINGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CookieBinding[];
    return Array.isArray(parsed) ? parsed.filter(isValidCookieBinding) : [];
  } catch {
    return [];
  }
}

export function saveCookieBindings(bindings: CookieBinding[]) {
  localStorage.setItem(BINDINGS_KEY, JSON.stringify(bindings));
}

export function loadSelectedBindingId(): string | null {
  if (typeof window === "undefined") return null;
  purgeLegacyCookieBridgeStorage();
  return localStorage.getItem(SELECTED_BINDING_KEY);
}

export function saveSelectedBindingId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) localStorage.setItem(SELECTED_BINDING_KEY, id);
  else localStorage.removeItem(SELECTED_BINDING_KEY);
}

export function loadCookieBridgePrefs(): CookieBridgePrefs {
  if (typeof window === "undefined") {
    return {
      syncIntervalMinutes: 60,
      realtimeSync: true,
      vaultSync: true,
      realtimeVaultApply: false,
      bridgeRole: "writer",
    };
  }
  try {
    purgeLegacyCookieBridgeStorage();
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) {
      return {
        syncIntervalMinutes: 60,
        realtimeSync: true,
        vaultSync: true,
        realtimeVaultApply: false,
        bridgeRole: "writer",
      };
    }
    const p = JSON.parse(raw) as Partial<CookieBridgePrefs>;
    return {
      syncIntervalMinutes: p.syncIntervalMinutes ?? 60,
      realtimeSync: p.realtimeSync ?? true,
      vaultSync: p.vaultSync !== false,
      realtimeVaultApply: p.realtimeVaultApply === true,
      bridgeRole: p.bridgeRole === "reader" ? "reader" : "writer",
    };
  } catch {
    return {
      syncIntervalMinutes: 60,
      realtimeSync: true,
      vaultSync: true,
      realtimeVaultApply: false,
      bridgeRole: "writer",
    };
  }
}

export function saveCookieBridgePrefs(prefs: CookieBridgePrefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

/** Payload sent to extension — always include noteId when present (UUID mode). */
export function bindingsForExtension(bindings: CookieBinding[]) {
  return bindings
    .filter((b) => b.enabled && b.domain?.trim() && (b.syncId?.trim() || b.noteId?.trim()))
    .map((b) => ({
      syncId: b.syncId?.trim() ?? "",
      noteId: b.noteId?.trim() ?? "",
      pass: b.pass ?? "",
      domain: b.domain.trim(),
      requiresPass: false,
      noteTitle: b.noteTitle ?? "",
      sourceBrowserId: b.sourceBrowserId ?? null,
      sourceLabel: b.sourceLabel ?? null,
      ownerUserId: b.ownerUserId ?? null,
      ownerUserEmail: b.ownerUserEmail ?? null,
      accessRole: b.accessRole ?? "owner",
      canPublish: b.canPublish !== false,
    }));
}

export function newBindingId(): string {
  return crypto.randomUUID();
}
