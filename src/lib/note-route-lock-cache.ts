import type { NoteRouteLockInfo } from "../features/cookie/noteRouteLockInfo";

const CACHE_KEY = "p0020:note:route-lock:v1";
const MAX_ENTRIES = 64;

type Entry = { at: number; routes: NoteRouteLockInfo[] };

function readMap(): Record<string, Entry> {
  if (typeof sessionStorage === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Entry>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, Entry>) {
  if (typeof sessionStorage === "undefined") return;
  const keys = Object.keys(map).sort((a, b) => map[b]!.at - map[a]!.at);
  const trimmed: Record<string, Entry> = {};
  for (const key of keys.slice(0, MAX_ENTRIES)) {
    trimmed[key] = map[key]!;
  }
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(trimmed));
  } catch {
    /* quota */
  }
}

export function readNoteRouteLockStale(noteId: string): NoteRouteLockInfo[] | null {
  const entry = readMap()[noteId];
  return entry?.routes ?? null;
}

export function writeNoteRouteLockCache(noteId: string, routes: NoteRouteLockInfo[]) {
  const map = readMap();
  map[noteId] = { at: Date.now(), routes };
  writeMap(map);
}

export function removeNoteRouteLockCache(noteId: string) {
  const map = readMap();
  if (!map[noteId]) return;
  delete map[noteId];
  writeMap(map);
}
