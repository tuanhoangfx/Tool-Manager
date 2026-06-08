export type NotesAutosaveSeconds = 5 | 10 | 15 | 30 | 60;

export const NOTES_AUTOSAVE_OPTIONS: NotesAutosaveSeconds[] = [5, 10, 15, 30, 60];

export const DEFAULT_NOTES_AUTOSAVE_SECONDS: NotesAutosaveSeconds = 15;

const STORAGE_KEY = "p0020:notes-autosave-seconds";

export const NOTES_AUTOSAVE_PREFS_CHANGE_EVENT = "notes-autosave-prefs-change";

export function parseNotesAutosaveSeconds(raw: string | null): NotesAutosaveSeconds {
  const n = Number(raw);
  if (n === 5 || n === 10 || n === 30 || n === 60) return n;
  return DEFAULT_NOTES_AUTOSAVE_SECONDS;
}

export function readNotesAutosaveSeconds(): NotesAutosaveSeconds {
  if (typeof window === "undefined") return DEFAULT_NOTES_AUTOSAVE_SECONDS;
  try {
    return parseNotesAutosaveSeconds(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_NOTES_AUTOSAVE_SECONDS;
  }
}

export function readNotesAutosaveDebounceMs(): number {
  return readNotesAutosaveSeconds() * 1000;
}

export function writeNotesAutosaveSeconds(seconds: NotesAutosaveSeconds) {
  window.localStorage.setItem(STORAGE_KEY, String(seconds));
  window.dispatchEvent(new CustomEvent(NOTES_AUTOSAVE_PREFS_CHANGE_EVENT));
}

export function notesAutosaveLabel(seconds: NotesAutosaveSeconds): string {
  return `${seconds}s`;
}
