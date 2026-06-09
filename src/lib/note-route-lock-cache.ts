import { createKeyedClientCache } from "@dev/hub-load";
import type { NoteRouteLockInfo } from "../features/cookie/noteRouteLockInfo";

const cache = createKeyedClientCache<NoteRouteLockInfo[]>({
  keyPrefix: "p0020:note:route-lock:v2",
  maxEntries: 64,
  ttlMs: 3 * 60_000,
  validate: (data): data is NoteRouteLockInfo[] =>
    Array.isArray(data) &&
    data.every(
      (r) => typeof r === "object" && r != null && "domain" in r && typeof (r as NoteRouteLockInfo).domain === "string",
    ),
});

export function readNoteRouteLockStale(noteId: string): NoteRouteLockInfo[] | null {
  return cache.readStale(noteId);
}

export function writeNoteRouteLockCache(noteId: string, routes: NoteRouteLockInfo[]) {
  cache.write(noteId, routes);
}

export function removeNoteRouteLockCache(noteId: string) {
  cache.remove(noteId);
}
