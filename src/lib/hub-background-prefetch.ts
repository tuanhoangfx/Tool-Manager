import { probeCookieSchemaHealth } from "../features/cookie/cookieSchemaHealth";
import { fetchCookieAgentsAndCommands } from "../features/cookie/cookieAgentsRepository";
import { cookieAgentsCache, cookieSchemaCache } from "./cookie-boot-cache";
import { writeNotesListClientCache } from "./notes-list-cache";
import { fetchNotesList } from "../features/notes/notesRepository";
import type { NoteRow } from "../features/notes/types";
import { listOfflineNotes } from "../features/notes/offlineNotesRepository";
import { getOfflineMode } from "./offlineMode";
import { isSupabaseConfigured } from "./supabase";

let notesPrefetchInFlight = false;
let cookieBootPrefetchInFlight = false;

/** Warm notes list cache on boot (stale-while-revalidate; same pattern as Hub quota prefetch). */
export function prefetchNotesListBackground(): void {
  if (notesPrefetchInFlight) return;
  notesPrefetchInFlight = true;
  void (async () => {
    try {
      if (getOfflineMode()) {
        const rows = await listOfflineNotes();
        writeNotesListClientCache(rows);
        return;
      }
      const { data, error } = await fetchNotesList();
      if (!error && data) {
        writeNotesListClientCache(data as NoteRow[]);
      }
    } catch {
      /* auth not ready or network offline */
    } finally {
      notesPrefetchInFlight = false;
    }
  })();
}

/** Warm Cookie Auto schema + agents while user is on Notes (first open feels instant). */
export function prefetchCookieBootBackground() {
  if (cookieBootPrefetchInFlight || !isSupabaseConfigured || getOfflineMode()) return;
  if (cookieSchemaCache.readStale() && cookieAgentsCache.readStale()) return;
  cookieBootPrefetchInFlight = true;
  void (async () => {
    try {
      if (!cookieSchemaCache.readStale()) {
        const health = await probeCookieSchemaHealth();
        cookieSchemaCache.write(health);
      }
      const agentsStale = cookieAgentsCache.readStale();
      if (!agentsStale || agentsStale.agents.length === 0) {
        const res = await fetchCookieAgentsAndCommands();
        if (res.ok) {
          cookieAgentsCache.write({ agents: res.agents, commands: res.commands });
        }
      }
    } catch {
      /* auth not ready */
    } finally {
      cookieBootPrefetchInFlight = false;
    }
  })();
}
