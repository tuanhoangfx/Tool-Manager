import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

export type NoteFolder = {
  id: string;
  name: string;
  color: string;
};

type FolderStore = {
  folders: NoteFolder[];
  noteFolders: Record<string, string | null>;
  filterId: string | null;
};

const STORAGE_KEY = "p0020:notes:folders:v1";
const CHANGE_EVENT = "notes-folders-change";
const COLORS = ["#818cf8", "#22d3ee", "#f59e0b", "#a78bfa", "#34d399", "#fb7185"];

type FolderRow = {
  id: string;
  name: string;
  color: string;
};

type NoteFolderRow = {
  note_id: string;
  folder_id: string;
};

function defaultStore(): FolderStore {
  return { folders: [], noteFolders: {}, filterId: null };
}

function readStore(): FolderStore {
  if (typeof window === "undefined") return defaultStore();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<FolderStore> | null;
    return {
      folders: Array.isArray(parsed?.folders) ? parsed.folders : [],
      noteFolders: parsed?.noteFolders && typeof parsed.noteFolders === "object" ? parsed.noteFolders : {},
      filterId: typeof parsed?.filterId === "string" ? parsed.filterId : null,
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

      const next: FolderStore = {
        folders: ((foldersRes.data ?? []) as FolderRow[]).map((f) => ({
          id: f.id,
          name: f.name,
          color: f.color,
        })),
        noteFolders: Object.fromEntries(
          ((mappingsRes.data ?? []) as NoteFolderRow[]).map((m) => [m.note_id, m.folder_id]),
        ),
        filterId: readStore().filterId,
      };
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
    async (name: string): Promise<NoteFolder | null> => {
      const clean = name.trim();
      if (!clean) return null;
      if (session && remoteReady) {
        const color = COLORS[readStore().folders.length % COLORS.length];
        const { data, error } = await supabase
          .from("note_folders")
          .insert({ user_id: session.user.id, name: clean, color })
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
        color: COLORS[cur.folders.length % COLORS.length],
      };
      commit((cur) => {
        if (cur.folders.some((f) => f.id === created.id || f.name.toLowerCase() === clean.toLowerCase())) return cur;
        return { ...cur, folders: [...cur.folders, created] };
      });
      return created;
    },
    [commit, remoteReady, session],
  );

  const assignNoteFolder = useCallback(
    async (noteId: string, folderId: string | null) => {
      if (session && remoteReady) {
        if (folderId) {
          const { error } = await supabase.from("note_folder_notes").upsert({
            note_id: noteId,
            folder_id: folderId,
            user_id: session.user.id,
          });
          if (error && !isMissingFolderTable(error.message)) throw error;
        } else {
          const { error } = await supabase.from("note_folder_notes").delete().eq("note_id", noteId);
          if (error && !isMissingFolderTable(error.message)) throw error;
        }
      }
      commit((cur) => ({
        ...cur,
        noteFolders: { ...cur.noteFolders, [noteId]: folderId },
      }));
    },
    [commit, remoteReady, session],
  );

  const renameFolder = useCallback(
    async (folderId: string, name: string) => {
      const clean = name.trim();
      if (!clean) return;
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
      if (session && remoteReady) {
        const { error } = await supabase.from("note_folders").delete().eq("id", folderId);
        if (error && !isMissingFolderTable(error.message)) throw error;
      }
      commit((cur) => ({
        ...cur,
        folders: cur.folders.filter((f) => f.id !== folderId),
        filterId: cur.filterId === folderId ? null : cur.filterId,
        noteFolders: Object.fromEntries(
          Object.entries(cur.noteFolders).map(([noteId, id]) => [noteId, id === folderId ? null : id]),
        ),
      }));
    },
    [commit, remoteReady, session],
  );

  const setFilterId = useCallback(
    (folderId: string | null) => {
      commit((cur) => ({ ...cur, filterId: folderId }));
    },
    [commit],
  );

  const value = useMemo(
    () => ({
      folders: store.folders,
      noteFolders: store.noteFolders,
      filterId: store.filterId,
      createFolder,
      assignNoteFolder,
      renameFolder,
      setFolderColor,
      deleteFolder,
      setFilterId,
      remoteReady,
    }),
    [
      assignNoteFolder,
      createFolder,
      deleteFolder,
      remoteReady,
      renameFolder,
      setFilterId,
      setFolderColor,
      store.filterId,
      store.folders,
      store.noteFolders,
    ],
  );

  return value;
}
