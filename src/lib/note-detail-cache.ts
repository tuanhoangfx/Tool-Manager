import { createKeyedClientCache } from "@dev/hub-load";
import type { NoteRow } from "../features/notes/types";

const cache = createKeyedClientCache<NoteRow>({
  keyPrefix: "p0020:note:detail:v2",
  maxEntries: 48,
  ttlMs: 3 * 60_000,
  validate: (data): data is NoteRow =>
    typeof data === "object" && data != null && "id" in data && typeof (data as NoteRow).id === "string",
});

export function readNoteDetailStale(noteId: string): NoteRow | null {
  return cache.readStale(noteId);
}

export function writeNoteDetailCache(noteId: string, row: NoteRow) {
  cache.write(noteId, row);
}

export function removeNoteDetailCache(noteId: string) {
  cache.remove(noteId);
}
