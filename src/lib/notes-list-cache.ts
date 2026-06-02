import { createClientCache } from "@dev/hub-load";
import type { NoteRow } from "../features/notes/types";

export const notesListCache = createClientCache<NoteRow[]>({
  key: "p0020:notes:list:v1",
  ttlMs: 3 * 60_000,
  validate: (data): data is NoteRow[] => Array.isArray(data),
});

export function readNotesListStaleCache(): NoteRow[] | null {
  return notesListCache.readStale();
}

export function writeNotesListClientCache(rows: NoteRow[]) {
  notesListCache.write(rows);
}
