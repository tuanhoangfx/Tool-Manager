import { readNoteDetailStale, writeNoteDetailCache } from "../../lib/note-detail-cache";
import { getOfflineMode } from "../../lib/offlineMode";
import { getOfflineNote } from "./offlineNotesRepository";
import { fetchNoteById } from "./notesRepository";
import type { NoteRow } from "./types";

const inflight = new Map<string, Promise<NoteRow | null>>();

/** Warm note detail cache on list-row hover — editor opens without fetch round-trip. */
export function prefetchNoteDetail(noteId: string | null | undefined): void {
  const id = noteId?.trim();
  if (!id || readNoteDetailStale(id) || inflight.has(id)) return;

  const pending = (async (): Promise<NoteRow | null> => {
    if (getOfflineMode()) return getOfflineNote(id);
    const { data, error } = await fetchNoteById(id);
    if (error || !data) return null;
    return data as NoteRow;
  })().then((row) => {
    inflight.delete(id);
    if (row) writeNoteDetailCache(id, row);
    return row;
  });

  inflight.set(id, pending);
}

/** Warm first viewport notes after list load (idle) — first click without hover. */
export function prefetchNoteDetailBatch(noteIds: readonly string[], limit = 8): void {
  for (const id of noteIds.slice(0, limit)) prefetchNoteDetail(id);
}

/** Consume hover prefetch (if any) so detail load skips the round trip. */
export function takePrefetchedNoteDetail(noteId: string): Promise<NoteRow | null> | undefined {
  const id = noteId.trim();
  const pending = inflight.get(id);
  if (pending) {
    inflight.delete(id);
    return pending;
  }
  const stale = readNoteDetailStale(id);
  return stale ? Promise.resolve(stale) : undefined;
}
