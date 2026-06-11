import type { Session } from "@supabase/supabase-js";
import { probeCookieSchemaHealth } from "../features/cookie/cookieSchemaHealth";
import { cookieSchemaCache } from "./cookie-boot-cache";
import { ensureDataBoxAuth } from "./ensure-data-box-auth";
import { writeNotesListClientCache } from "./notes-list-cache";
import { fetchNotesList } from "../features/notes/notesRepository";
import type { NoteRow } from "../features/notes/types";
import { listOfflineNotes } from "../features/notes/offlineNotesRepository";
import { getOfflineMode, offlineSession } from "./offlineMode";
import { isSupabaseConfigured } from "./supabase";
import { ensureWorkspaceProfile } from "./workspace-profile";
import { prefetchTodoTasksBackground } from "./prefetch-todo-tasks-background";
import { prefetchTwofaVaultBackground } from "./prefetch-twofa-vault-background";
import {
  readWarmTodoProfile,
  sessionUserId,
  writeWarmTodoProfile,
} from "./todo-profile-warm-cache";

let notesPrefetchInFlight = false;
let cookieBootPrefetchInFlight = false;
let todoProfilePrefetchInFlight = false;

/** Warm notes list cache on boot (stale-while-revalidate; same pattern as Hub quota prefetch). */
export function prefetchNotesListBackground(): void {
  if (notesPrefetchInFlight) return;
  notesPrefetchInFlight = true;
  void (async () => {
    try {
      if (getOfflineMode()) {
        const rows = await listOfflineNotes();
        const userId = offlineSession().user.id;
        writeNotesListClientCache(userId, rows);
        return;
      }
      const session = await ensureDataBoxAuth();
      const userId = session?.user?.id;
      if (!userId) return;
      const { data, error } = await fetchNotesList();
      if (!error && data) {
        writeNotesListClientCache(userId, data as NoteRow[]);
      }
    } catch {
      /* auth not ready or network offline */
    } finally {
      notesPrefetchInFlight = false;
    }
  })();
}

/** Warm Cookie Auto schema probe while user is on Notes (first open feels instant). */
/** Warm Todo profile RPC before first tab open (stale hit in useWorkspaceProfile). */
export function prefetchTodoBootBackground(session?: Session | null): void {
  if (todoProfilePrefetchInFlight || getOfflineMode() || !isSupabaseConfigured) return;
  const userId = sessionUserId(session);
  if (userId && readWarmTodoProfile(userId)) return;
  todoProfilePrefetchInFlight = true;
  void (async () => {
    try {
      const resolved = session ?? (await ensureDataBoxAuth());
      const uid = sessionUserId(resolved);
      if (!uid) return;
      const profile = await ensureWorkspaceProfile(resolved!.user);
      if (profile) writeWarmTodoProfile(uid, profile);
    } catch {
      /* auth not ready */
    } finally {
      todoProfilePrefetchInFlight = false;
    }
  })();
}

/** Warm lazy-tab data (Todo profile/tasks, 2FA vault, Cookie schema) after session. */
export function prefetchWorkspaceTabsBackground(session?: Session | null): void {
  prefetchTodoBootBackground(session);
  prefetchTodoTasksBackground(session);
  prefetchTwofaVaultBackground();
  prefetchCookieBootBackground();
}

export function prefetchCookieBootBackground() {
  if (cookieBootPrefetchInFlight || !isSupabaseConfigured || getOfflineMode()) return;
  if (cookieSchemaCache.readStale()) return;
  cookieBootPrefetchInFlight = true;
  void (async () => {
    try {
      const health = await probeCookieSchemaHealth();
      cookieSchemaCache.write(health);
    } catch {
      /* auth not ready */
    } finally {
      cookieBootPrefetchInFlight = false;
    }
  })();
}
