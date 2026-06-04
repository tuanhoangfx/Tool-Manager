import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import {
  COOKIE_AUTO_FOLDER,
  countFolderNotes,
  getEffectiveNoteFolderIds,
  getPrimaryFolderForListNote,
  getUserFolderIds,
  isReservedFolderName,
  isSystemFolder,
  mergeDisplayFolders,
  noteMatchesFolderFilter,
  type NoteFolderNoteRef,
} from "./noteFolderLifecycle";

export type NoteFolder = {
  id: string;
  name: string;
  color: string;
};

export {
  COOKIE_AUTO_FOLDER,
  COOKIE_AUTO_FOLDER_ID,
  NEW_FOLDER,
  NEW_FOLDER_ID,
  UNORGANIZED_FOLDER,
  UNORGANIZED_FOLDER_ID,
  countFolderNotes,
  getEffectiveNoteFolderIds,
  getPrimaryFolderForListNote,
  getUserFolderIds,
  hasUserFolders,
  isCookieAutoFolder,
  isNewFolder,
  isReservedFolderName,
  isSystemFolder,
  isUnorganizedFolder,
  mergeDisplayFolders,
  noteMatchesFolderFilter,
  type NoteFolderNoteRef,
} from "./noteFolderLifecycle";

type FolderStore = {
  version: 2;
  folders: NoteFolder[];
  noteFolders: Record<string, string[]>;
  filterIds: string[];
};

const STORAGE_KEY = "p0020:notes:folders:v2";
const LEGACY_STORAGE_KEY = "p0020:notes:folders:v1";
const CHANGE_EVENT = "notes-folders-change";
export const NOTE_FOLDER_COLORS = ["#818cf8", "#22d3ee", "#f59e0b", "#a78bfa", "#34d399", "#fb7185"] as const;
const COLORS = NOTE_FOLDER_COLORS;

type FolderRow = {
  id: string;
  name: string;
  color: string;
};

type NoteFolderRow = {
  note_id: string;
  folder_id: string;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function mergeFolderLists(local: NoteFolder[], remote: NoteFolder[]): NoteFolder[] {
  const byId = new Map<string, NoteFolder>();
  for (const folder of remote) {
    if (!isSystemFolder(folder.id)) byId.set(folder.id, folder);
  }
  for (const folder of local) {
    if (isSystemFolder(folder.id)) continue;
    if (!byId.has(folder.id)) byId.set(folder.id, folder);
  }
  return [...byId.values()];
}

function mergeNoteFoldersPreferLocal(
  local: Record<string, string[]>,
  remote: Record<string, string[]>,
  validFolderIds: Set<string>,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const noteIds = new Set([...Object.keys(local), ...Object.keys(remote)]);
  for (const noteId of noteIds) {
    const ids = noteId in local ? local[noteId] : (remote[noteId] ?? []);
    const cleaned = [...new Set(ids)].filter((id) => !isSystemFolder(id) && validFolderIds.has(id));
    if (cleaned.length) out[noteId] = cleaned;
  }
  return out;
}

async function flushPendingFolderSync(session: Session, store: FolderStore): Promise<FolderStore> {
  let folders = [...store.folders];
  const idRemap = new Map<string, string>();

  for (const folder of folders) {
    if (isUuid(folder.id)) continue;
    const insertRes = await supabase
      .from("note_folders")
      .insert({ user_id: session.user.id, name: folder.name, color: folder.color })
      .select("id,name,color")
      .single();
    if (!insertRes.error && insertRes.data) {
      idRemap.set(folder.id, (insertRes.data as FolderRow).id);
      continue;
    }
    const existingRes = await supabase
      .from("note_folders")
      .select("id,name,color")
      .eq("user_id", session.user.id)
      .eq("name", folder.name)
      .maybeSingle();
    if (!existingRes.error && existingRes.data) {
      idRemap.set(folder.id, (existingRes.data as FolderRow).id);
    }
  }

  if (idRemap.size) {
    folders = folders.map((folder) => {
      const mapped = idRemap.get(folder.id);
      return mapped ? { ...folder, id: mapped } : folder;
    });
  }

  const noteFolders: Record<string, string[]> = {};
  for (const [noteId, ids] of Object.entries(store.noteFolders)) {
    const remapped = ids.map((id) => idRemap.get(id) ?? id).filter((id) => !isSystemFolder(id));
    if (remapped.length) noteFolders[noteId] = remapped;
  }

  const validFolderIds = new Set(folders.map((f) => f.id));
  const mappingsRes = await supabase.from("note_folder_notes").select("note_id,folder_id");
  const remoteByNote = new Map<string, Set<string>>();
  if (!mappingsRes.error && mappingsRes.data) {
    for (const row of mappingsRes.data as NoteFolderRow[]) {
      if (!remoteByNote.has(row.note_id)) remoteByNote.set(row.note_id, new Set());
      remoteByNote.get(row.note_id)!.add(row.folder_id);
    }
  }

  const noteIds = new Set([...Object.keys(noteFolders), ...remoteByNote.keys()]);
  for (const noteId of noteIds) {
    const target = new Set(
      (noteFolders[noteId] ?? []).filter((id) => validFolderIds.has(id) && isUuid(id)),
    );
    const remote = remoteByNote.get(noteId) ?? new Set();

    for (const folderId of target) {
      if (remote.has(folderId)) continue;
      const { error } = await supabase.from("note_folder_notes").upsert(
        { note_id: noteId, folder_id: folderId, user_id: session.user.id },
        { onConflict: "note_id,folder_id" },
      );
      if (error && !isMissingFolderTable(error.message)) throw error;
    }
    for (const folderId of remote) {
      if (target.has(folderId)) continue;
      const { error } = await supabase
        .from("note_folder_notes")
        .delete()
        .eq("note_id", noteId)
        .eq("folder_id", folderId);
      if (error && !isMissingFolderTable(error.message)) throw error;
    }
  }

  return {
    ...store,
    folders,
    noteFolders: mergeNoteFoldersPreferLocal(noteFolders, {}, validFolderIds),
  };
}

function defaultStore(): FolderStore {
  return { version: 2, folders: [], noteFolders: {}, filterIds: [] };
}

function normalizeNoteFolders(raw: unknown): Record<string, string[]> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string[]> = {};
  for (const [noteId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      out[noteId] = value.filter((id): id is string => typeof id === "string" && !isSystemFolder(id));
    } else if (typeof value === "string" && !isSystemFolder(value)) {
      out[noteId] = [value];
    } else {
      out[noteId] = [];
    }
  }
  return out;
}

function readStore(): FolderStore {
  if (typeof window === "undefined") return defaultStore();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
    const parsed = JSON.parse(raw ?? "null") as Partial<FolderStore> & {
      filterId?: string | null;
      noteFolders?: Record<string, string | null | string[]>;
    } | null;
    if (!parsed) return defaultStore();
    const filterIds = Array.isArray(parsed.filterIds)
      ? parsed.filterIds.filter((id): id is string => typeof id === "string")
      : typeof parsed.filterId === "string"
        ? [parsed.filterId]
        : [];
    return {
      version: 2,
      folders: Array.isArray(parsed.folders) ? parsed.folders.filter((f) => !isSystemFolder(f.id)) : [],
      noteFolders: normalizeNoteFolders(parsed.noteFolders),
      filterIds,
    };
  } catch {
    return defaultStore();
  }
}

function writeStore(next: FolderStore) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function isMissingFolderTable(message: string): boolean {
  return /note_folders|note_folder_notes/i.test(message) && /does not exist|schema cache|not found|relation/i.test(message);
}

function slugId(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "folder"}-${Date.now().toString(36)}`;
}

export function useNoteFolders(session: Session | null) {
  const [store, setStore] = useState(readStore);
  const [remoteReady, setRemoteReady] = useState(false);

  useEffect(() => {
    const sync = () => setStore(readStore());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadRemote() {
      if (!session) {
        setRemoteReady(false);
        return;
      }
      const foldersRes = await supabase
        .from("note_folders")
        .select("id,name,color")
        .order("updated_at", { ascending: false });
      if (cancelled) return;
      if (foldersRes.error) {
        if (isMissingFolderTable(foldersRes.error.message)) setRemoteReady(false);
        return;
      }

      const mappingsRes = await supabase.from("note_folder_notes").select("note_id,folder_id");
      if (cancelled) return;
      if (mappingsRes.error) {
        if (isMissingFolderTable(mappingsRes.error.message)) setRemoteReady(false);
        return;
      }

      const remoteNoteFolders: Record<string, string[]> = {};
      for (const row of (mappingsRes.data ?? []) as NoteFolderRow[]) {
        if (isSystemFolder(row.folder_id)) continue;
        if (!remoteNoteFolders[row.note_id]) remoteNoteFolders[row.note_id] = [];
        if (!remoteNoteFolders[row.note_id].includes(row.folder_id)) {
          remoteNoteFolders[row.note_id].push(row.folder_id);
        }
      }

      const local = readStore();
      const remoteFolders = ((foldersRes.data ?? []) as FolderRow[])
        .filter((f) => !isSystemFolder(f.id))
        .map((f) => ({
          id: f.id,
          name: f.name,
          color: f.color,
        }));

      const mergedFolders = mergeFolderLists(local.folders, remoteFolders);
      const validFolderIds = new Set(mergedFolders.map((f) => f.id));
      let next: FolderStore = {
        version: 2,
        folders: mergedFolders,
        noteFolders: mergeNoteFoldersPreferLocal(local.noteFolders, remoteNoteFolders, validFolderIds),
        filterIds: local.filterIds,
      };

      try {
        next = await flushPendingFolderSync(session, next);
      } catch {
        // Keep merged local state even if cloud flush fails (offline / RLS).
      }

      writeStore(next);
      setStore(next);
      setRemoteReady(true);
    }
    void loadRemote();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const commit = useCallback((updater: (cur: FolderStore) => FolderStore) => {
    const next = updater(readStore());
    writeStore(next);
    setStore(next);
    return next;
  }, []);

  const createFolder = useCallback(
    async (name: string, pickColor?: string): Promise<NoteFolder | null> => {
      const clean = name.trim();
      if (!clean || isReservedFolderName(clean)) return null;
      const nextColor = pickColor ?? COLORS[readStore().folders.length % COLORS.length];
      if (session && remoteReady) {
        const { data, error } = await supabase
          .from("note_folders")
          .insert({ user_id: session.user.id, name: clean, color: nextColor })
          .select("id,name,color")
          .single();
        if (!error && data) {
          const created = data as FolderRow;
          const folder: NoteFolder = { id: created.id, name: created.name, color: created.color };
          commit((cur) => ({ ...cur, folders: [folder, ...cur.folders.filter((f) => f.id !== folder.id)] }));
          return folder;
        }
        if (!isMissingFolderTable(error?.message ?? "")) {
          const existing = readStore().folders.find((f) => f.name.toLowerCase() === clean.toLowerCase());
          if (existing) return existing;
        }
      }

      const cur = readStore();
      const existing = cur.folders.find((f) => f.name.toLowerCase() === clean.toLowerCase());
      if (existing) return existing;
      const created: NoteFolder = {
        id: slugId(clean),
        name: clean,
        color: nextColor,
      };
      commit((cur) => {
        if (cur.folders.some((f) => f.id === created.id || f.name.toLowerCase() === clean.toLowerCase())) return cur;
        return { ...cur, folders: [...cur.folders, created] };
      });
      return created;
    },
    [commit, remoteReady, session],
  );

  const toggleNoteFolder = useCallback(
    async (noteId: string, folderId: string, enabled: boolean) => {
      if (isSystemFolder(folderId)) return;
      const current = getUserFolderIds(noteId, readStore().noteFolders);
      const next = enabled ? [...new Set([...current, folderId])] : current.filter((id) => id !== folderId);

      commit((cur) => ({
        ...cur,
        noteFolders: { ...cur.noteFolders, [noteId]: next },
      }));

      if (!session || !remoteReady) return;

      if (enabled) {
        const { error } = await supabase.from("note_folder_notes").upsert(
          { note_id: noteId, folder_id: folderId, user_id: session.user.id },
          { onConflict: "note_id,folder_id" },
        );
        if (error && !isMissingFolderTable(error.message)) throw error;
      } else {
        const { error } = await supabase
          .from("note_folder_notes")
          .delete()
          .eq("note_id", noteId)
          .eq("folder_id", folderId);
        if (error && !isMissingFolderTable(error.message)) throw error;
      }
    },
    [commit, remoteReady, session],
  );

  const setUserNoteFolders = useCallback(
    async (noteId: string, folderIds: string[]) => {
      const target = [...new Set(folderIds.filter((id) => !isSystemFolder(id)))];
      const prev = getUserFolderIds(noteId, readStore().noteFolders);

      commit((cur) => ({
        ...cur,
        noteFolders: { ...cur.noteFolders, [noteId]: target },
      }));

      if (!session || !remoteReady) return;

      const toAdd = target.filter((id) => !prev.includes(id));
      const toRemove = prev.filter((id) => !target.includes(id));

      for (const folderId of toRemove) {
        const { error } = await supabase
          .from("note_folder_notes")
          .delete()
          .eq("note_id", noteId)
          .eq("folder_id", folderId);
        if (error && !isMissingFolderTable(error.message)) throw error;
      }
      for (const folderId of toAdd) {
        const { error } = await supabase.from("note_folder_notes").upsert(
          { note_id: noteId, folder_id: folderId, user_id: session.user.id },
          { onConflict: "note_id,folder_id" },
        );
        if (error && !isMissingFolderTable(error.message)) throw error;
      }
    },
    [commit, remoteReady, session],
  );

  const renameFolder = useCallback(
    async (folderId: string, name: string) => {
      if (isSystemFolder(folderId)) return;
      const clean = name.trim();
      if (!clean || isReservedFolderName(clean)) return;
      if (session && remoteReady) {
        const { error } = await supabase.from("note_folders").update({ name: clean }).eq("id", folderId);
        if (error && !isMissingFolderTable(error.message)) throw error;
      }
      commit((cur) => ({
        ...cur,
        folders: cur.folders.map((f) => (f.id === folderId ? { ...f, name: clean } : f)),
      }));
    },
    [commit, remoteReady, session],
  );

  const setFolderColor = useCallback(
    async (folderId: string, color: string) => {
      if (isSystemFolder(folderId)) return;
      if (session && remoteReady) {
        const { error } = await supabase.from("note_folders").update({ color }).eq("id", folderId);
        if (error && !isMissingFolderTable(error.message)) throw error;
      }
      commit((cur) => ({
        ...cur,
        folders: cur.folders.map((f) => (f.id === folderId ? { ...f, color } : f)),
      }));
    },
    [commit, remoteReady, session],
  );

  const deleteFolder = useCallback(
    async (folderId: string) => {
      if (isSystemFolder(folderId)) return;
      if (session && remoteReady) {
        const { error } = await supabase.from("note_folders").delete().eq("id", folderId);
        if (error && !isMissingFolderTable(error.message)) throw error;
      }
      commit((cur) => ({
        ...cur,
        folders: cur.folders.filter((f) => f.id !== folderId),
        filterIds: cur.filterIds.filter((id) => id !== folderId),
        noteFolders: Object.fromEntries(
          Object.entries(cur.noteFolders).map(([noteId, ids]) => [noteId, ids.filter((id) => id !== folderId)]),
        ),
      }));
    },
    [commit, remoteReady, session],
  );

  const setFilterIds = useCallback(
    (folderIds: string[]) => {
      commit((cur) => ({ ...cur, filterIds: [...new Set(folderIds)] }));
    },
    [commit],
  );

  const toggleFilterId = useCallback(
    (folderId: string) => {
      commit((cur) => {
        const has = cur.filterIds.includes(folderId);
        return {
          ...cur,
          filterIds: has ? cur.filterIds.filter((id) => id !== folderId) : [...cur.filterIds, folderId],
        };
      });
    },
    [commit],
  );

  const clearFilterIds = useCallback(() => {
    commit((cur) => ({ ...cur, filterIds: [] }));
  }, [commit]);

  return useMemo(
    () => ({
      folders: store.folders,
      noteFolders: store.noteFolders,
      filterIds: store.filterIds,
      createFolder,
      toggleNoteFolder,
      setUserNoteFolders,
      renameFolder,
      setFolderColor,
      deleteFolder,
      setFilterIds,
      toggleFilterId,
      clearFilterIds,
      remoteReady,
    }),
    [
      clearFilterIds,
      createFolder,
      deleteFolder,
      remoteReady,
      renameFolder,
      setFilterIds,
      setFolderColor,
      setUserNoteFolders,
      store.filterIds,
      store.folders,
      store.noteFolders,
      toggleFilterId,
      toggleNoteFolder,
    ],
  );
}
