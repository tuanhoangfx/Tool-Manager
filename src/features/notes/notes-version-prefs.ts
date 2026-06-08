export type NotesVersionIntervalMinutes = 15 | 30 | 60;

export const NOTES_VERSION_INTERVAL_OPTIONS: NotesVersionIntervalMinutes[] = [15, 30, 60];

export const DEFAULT_NOTES_VERSION_INTERVAL_MINUTES: NotesVersionIntervalMinutes = 15;

const STORAGE_KEY = "p0020:notes-version-interval-minutes";

export const NOTES_VERSION_PREFS_CHANGE_EVENT = "notes-version-prefs-change";

export function parseNotesVersionIntervalMinutes(raw: string | null): NotesVersionIntervalMinutes {
  const n = Number(raw);
  if (n === 30 || n === 60) return n;
  return DEFAULT_NOTES_VERSION_INTERVAL_MINUTES;
}

export function readNotesVersionIntervalMinutes(): NotesVersionIntervalMinutes {
  if (typeof window === "undefined") return DEFAULT_NOTES_VERSION_INTERVAL_MINUTES;
  try {
    return parseNotesVersionIntervalMinutes(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_NOTES_VERSION_INTERVAL_MINUTES;
  }
}

export function writeNotesVersionIntervalMinutes(minutes: NotesVersionIntervalMinutes) {
  window.localStorage.setItem(STORAGE_KEY, String(minutes));
  window.dispatchEvent(new CustomEvent(NOTES_VERSION_PREFS_CHANGE_EVENT));
}

export function notesVersionIntervalLabel(minutes: NotesVersionIntervalMinutes): string {
  return `${minutes} min`;
}

export function notesVersionIntervalMs(minutes?: NotesVersionIntervalMinutes): number {
  return (minutes ?? readNotesVersionIntervalMinutes()) * 60 * 1000;
}
