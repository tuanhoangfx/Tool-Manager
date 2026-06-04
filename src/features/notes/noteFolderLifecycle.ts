import type { NoteFolder } from "./noteFolders";

export const NEW_FOLDER_ID = "__p0020_new__";
export const UNORGANIZED_FOLDER_ID = "__p0020_unorganized__";
export const COOKIE_AUTO_FOLDER_ID = "__p0020_cookie_auto__";

export const NEW_FOLDER_MS = 86_400_000;

export const COOKIE_AUTO_FOLDER: NoteFolder = {
  id: COOKIE_AUTO_FOLDER_ID,
  name: "Cookie Auto",
  color: "#f59e0b",
};

export const NEW_FOLDER: NoteFolder = {
  id: NEW_FOLDER_ID,
  name: "New",
  color: "#34d399",
};

export const UNORGANIZED_FOLDER: NoteFolder = {
  id: UNORGANIZED_FOLDER_ID,
  name: "Unorganized",
  color: "#94a3b8",
};

const SYSTEM_FOLDER_IDS = new Set<string>([COOKIE_AUTO_FOLDER_ID, NEW_FOLDER_ID, UNORGANIZED_FOLDER_ID]);

const RESERVED_FOLDER_NAMES = new Set(
  [COOKIE_AUTO_FOLDER.name, NEW_FOLDER.name, UNORGANIZED_FOLDER.name].map((n) => n.toLowerCase()),
);

export function isSystemFolder(folderId: string): boolean {
  return SYSTEM_FOLDER_IDS.has(folderId);
}

export function isCookieAutoFolder(folderId: string): boolean {
  return folderId === COOKIE_AUTO_FOLDER_ID;
}

export function isNewFolder(folderId: string): boolean {
  return folderId === NEW_FOLDER_ID;
}

export function isUnorganizedFolder(folderId: string): boolean {
  return folderId === UNORGANIZED_FOLDER_ID;
}

export function isReservedFolderName(name: string): boolean {
  return RESERVED_FOLDER_NAMES.has(name.trim().toLowerCase());
}

export function mergeDisplayFolders(folders: NoteFolder[]): NoteFolder[] {
  const userFolders = folders.filter((f) => !isSystemFolder(f.id));
  return [COOKIE_AUTO_FOLDER, NEW_FOLDER, UNORGANIZED_FOLDER, ...userFolders];
}

export function getUserFolderIds(noteId: string, noteFolders: Record<string, string[]>): string[] {
  return (noteFolders[noteId] ?? []).filter((id) => !isSystemFolder(id));
}

export function noteCreatedAtMs(createdAt?: string | null, fallbackNow = Date.now()): number {
  if (!createdAt?.trim()) return fallbackNow;
  const at = new Date(createdAt).getTime();
  return Number.isNaN(at) ? fallbackNow : at;
}

export function hasUserFolders(noteId: string, noteFolders: Record<string, string[]>): boolean {
  return getUserFolderIds(noteId, noteFolders).length > 0;
}

export function isNoteInNewFolder(createdAt?: string | null, now = Date.now()): boolean {
  return now - noteCreatedAtMs(createdAt, now) < NEW_FOLDER_MS;
}

export function isNoteInUnorganized(
  noteId: string,
  noteFolders: Record<string, string[]>,
  createdAt: string | null | undefined,
  cookieRouteNoteIds: ReadonlySet<string>,
  now = Date.now(),
): boolean {
  if (isNoteInNewFolder(createdAt, now)) return false;
  if (hasUserFolders(noteId, noteFolders)) return false;
  if (cookieRouteNoteIds.has(noteId)) return false;
  return true;
}

export function getAutoSystemFolderIds(
  noteId: string,
  createdAt: string | null | undefined,
  noteFolders: Record<string, string[]>,
  cookieRouteNoteIds: ReadonlySet<string>,
  now = Date.now(),
): string[] {
  const ids: string[] = [];
  if (cookieRouteNoteIds.has(noteId)) ids.push(COOKIE_AUTO_FOLDER_ID);
  if (isNoteInNewFolder(createdAt, now)) ids.push(NEW_FOLDER_ID);
  else if (isNoteInUnorganized(noteId, noteFolders, createdAt, cookieRouteNoteIds, now)) {
    ids.push(UNORGANIZED_FOLDER_ID);
  }
  return ids;
}

export function getEffectiveNoteFolderIds(
  noteId: string,
  noteFolders: Record<string, string[]>,
  cookieRouteNoteIds: ReadonlySet<string>,
  createdAt?: string | null,
  now = Date.now(),
): string[] {
  const user = getUserFolderIds(noteId, noteFolders);
  const auto = getAutoSystemFolderIds(noteId, createdAt, noteFolders, cookieRouteNoteIds, now);
  return [...new Set([...user, ...auto])];
}

export type NoteFolderNoteRef = { id: string; created_at?: string | null };

export function collectFolderNoteRefs(
  notes: NoteFolderNoteRef[],
  noteFolders: Record<string, string[]>,
  cookieRouteNoteIds: ReadonlySet<string>,
): NoteFolderNoteRef[] {
  const byId = new Map<string, NoteFolderNoteRef>();
  for (const n of notes) byId.set(n.id, n);
  for (const noteId of Object.keys(noteFolders)) {
    if (!byId.has(noteId)) byId.set(noteId, { id: noteId, created_at: null });
  }
  for (const noteId of cookieRouteNoteIds) {
    if (!byId.has(noteId)) byId.set(noteId, { id: noteId, created_at: null });
  }
  return [...byId.values()];
}

export function countFolderNotes(
  folderId: string,
  noteFolders: Record<string, string[]>,
  cookieRouteNoteIds: ReadonlySet<string>,
  notes: NoteFolderNoteRef[],
  now = Date.now(),
): number {
  const refs = collectFolderNoteRefs(notes, noteFolders, cookieRouteNoteIds);
  if (isCookieAutoFolder(folderId)) {
    const tagged = new Set(cookieRouteNoteIds);
    for (const [noteId, ids] of Object.entries(noteFolders)) {
      if (ids.includes(folderId)) tagged.add(noteId);
    }
    return tagged.size;
  }
  let count = 0;
  for (const note of refs) {
    const effective = getEffectiveNoteFolderIds(
      note.id,
      noteFolders,
      cookieRouteNoteIds,
      note.created_at,
      now,
    );
    if (effective.includes(folderId)) count += 1;
  }
  return count;
}

export function getPrimaryFolderForListNote(
  noteId: string,
  createdAt: string | null | undefined,
  noteFolders: Record<string, string[]>,
  cookieRouteNoteIds: ReadonlySet<string>,
  allFolders: NoteFolder[],
  now = Date.now(),
): NoteFolder | null {
  const effective = getEffectiveNoteFolderIds(noteId, noteFolders, cookieRouteNoteIds, createdAt, now);
  const userId = effective.find((id) => !isSystemFolder(id));
  if (userId) return allFolders.find((f) => f.id === userId) ?? null;
  for (const id of [COOKIE_AUTO_FOLDER_ID, NEW_FOLDER_ID, UNORGANIZED_FOLDER_ID]) {
    if (effective.includes(id)) return allFolders.find((f) => f.id === id) ?? null;
  }
  return null;
}

export function noteMatchesFolderFilter(
  note: NoteFolderNoteRef,
  noteFolders: Record<string, string[]>,
  filterIds: string[],
  cookieRouteNoteIds: ReadonlySet<string> = new Set(),
  now = Date.now(),
): boolean {
  if (filterIds.length === 0) return true;
  const ids = getEffectiveNoteFolderIds(note.id, noteFolders, cookieRouteNoteIds, note.created_at, now);
  return filterIds.some((folderId) => ids.includes(folderId));
}
