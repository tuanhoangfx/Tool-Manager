import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FilterValues } from "../../components/sales-shell";
import { useAppToast } from "../../components/toast";
import { readNoteIdFromUrl } from "../design-preview/design-nav";
import { loadCookieBridgePrefs } from "../cookie/cookieBridge";
import { useNotesCookieRealtime } from "../cookie/useNotesCookieRealtime";
import { NoteEditorPanel } from "./NoteEditorPanel";
import { NotesHubChrome } from "./NotesHubChrome";
import { NotesListRail } from "./NotesListRail";
import { NotesAuthGate } from "./NotesAuthGate";
import { useNoteFolders } from "./noteFolders";
import { filterNotes } from "./notes-filters";
import { readNotesListPrefs, type NotesListDensity } from "./notes-list-prefs";
import { slugifyTitle } from "./noteUtils";
import { useNote } from "./useNote";
import { useNotes } from "./useNotes";
import { useNotesAuth } from "./useNotesAuth";

type Props = {
  navigate: (opts?: { note?: string; replace?: boolean }) => void;
};

export function NotesWorkspaceScreen({ navigate }: Props) {
  const { pushToast } = useAppToast();
  const { session, loading: authLoading, isSupabaseConfigured } = useNotesAuth();
  const { notes, loading: listLoading, error: listError, refresh, createNote, deleteNote } =
    useNotes(session);

  const [selectedId, setSelectedId] = useState(readNoteIdFromUrl);
  const { note, loading: noteLoading, error: noteError, saving, save } = useNote(session, selectedId);

  const [query, setQuery] = useState("");
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [prefs, setPrefs] = useState(readNotesListPrefs);
  const [density, setDensity] = useState<NotesListDensity>(() => readNotesListPrefs().density);
  const [creating, setCreating] = useState(false);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [domain, setDomain] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [shareEnabled, setShareEnabled] = useState(false);
  const [sharePassword, setSharePassword] = useState("");
  const [savedHint, setSavedHint] = useState("");
  const [actionError, setActionError] = useState("");
  const folders = useNoteFolders(session);
  const [dirty, setDirty] = useState(false);
  const lastAutosaveKey = useRef("");

  useEffect(() => {
    const sync = () => {
      setPrefs(readNotesListPrefs());
      setSelectedId(readNoteIdFromUrl());
    };
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  useNotesCookieRealtime(session, refresh, loadCookieBridgePrefs().realtimeSync);

  useEffect(() => {
    if (!note) return;
    setTitle(note.title.trim() === "Note mới" ? "New note" : note.title);
    setSlug(note.slug);
    setDomain(note.domain);
    setBody(note.body_md);
    setPinned(note.pinned);
    setShareEnabled(note.share_enabled);
    setSharePassword("");
    setActionError("");
    setDirty(false);
  }, [note]);

  const filtered = useMemo(() => {
    const base = filterNotes(notes, query, filterValues, prefs.range);
    if (!folders.filterId) return base;
    return base.filter((n) => folders.noteFolders[n.id] === folders.filterId);
  }, [filterValues, folders.filterId, folders.noteFolders, notes, prefs.range, query]);

  const pickNote = useCallback(
    (id: string) => {
      setSelectedId(id);
      navigate({ note: id });
    },
    [navigate],
  );

  useEffect(() => {
    if (listLoading || filtered.length === 0) return;
    const inList = selectedId && filtered.some((n) => n.id === selectedId);
    if (!inList) pickNote(filtered[0].id);
  }, [listLoading, filtered, selectedId, pickNote]);

  const onNew = async () => {
    setCreating(true);
    try {
      const row = await createNote();
      pickNote(row.id);
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const updateTitle = (next: string) => {
    setTitle(next);
    setDirty(true);
  };

  const updateBody = (next: string) => {
    setBody(next);
    setDirty(true);
  };

  const updateSharePassword = (next: string) => {
    setSharePassword(next);
    setDirty(true);
  };

  const persistCurrentNote = async (overrides?: {
    pinned?: boolean;
    shareEnabled?: boolean;
  }) => {
    if (!selectedId) throw new Error("No note selected");
    setActionError("");
    const nextPinned = overrides?.pinned ?? pinned;
    const nextShareEnabled = overrides?.shareEnabled ?? shareEnabled;
    const saved = await save({
      title,
      slug: slug.trim() || slugifyTitle(title, note?.slug || selectedId),
      domain,
      body_md: body,
      pinned: nextPinned,
      share_enabled: nextShareEnabled,
      share_password: sharePassword || undefined,
    });
    setPinned(saved.pinned);
    setShareEnabled(saved.share_enabled);
    setSlug(saved.slug);
    setSharePassword("");
    await refresh();
    setSavedHint("Saved");
    setTimeout(() => setSavedHint(""), 2500);
    return saved;
  };

  const onSave = async () => {
    try {
      await persistCurrentNote();
      setDirty(false);
      pushToast("Note saved", "success");
    } catch (err) {
      const msg = errorMessage(err, "Save failed");
      setActionError(msg);
      pushToast(msg, "error");
    }
  };

  useEffect(() => {
    if (!dirty || !selectedId || saving || creating) return;
    const key = `${selectedId}:${title}:${slug}:${domain}:${body}:${pinned}:${shareEnabled}:${sharePassword}`;
    if (key === lastAutosaveKey.current) return;
    const timer = window.setTimeout(() => {
      lastAutosaveKey.current = key;
      void persistCurrentNote()
        .then(() => {
          setDirty(false);
          pushToast("Autosaved", "success", 1800);
        })
        .catch((err) => {
          const msg = errorMessage(err, "Autosave failed");
          setActionError(msg);
          pushToast(msg, "error");
        });
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [body, creating, dirty, domain, pinned, pushToast, saving, selectedId, shareEnabled, sharePassword, slug, title]);

  const onPinnedToggle = async () => {
    const next = !pinned;
    setPinned(next);
    try {
      await persistCurrentNote({ pinned: next });
      pushToast(next ? "Pinned note" : "Unpinned note", "success");
    } catch (err) {
      setPinned(!next);
      const msg = errorMessage(err, "Pin update failed");
      setActionError(msg);
      pushToast(msg, "error");
    }
  };

  const onShareToggle = async () => {
    const next = !shareEnabled;
    setShareEnabled(next);
    try {
      const saved = await persistCurrentNote({ shareEnabled: next });
      pushToast(saved.share_enabled ? "Share link enabled" : "Share disabled", "success");
    } catch (err) {
      setShareEnabled(!next);
      const msg = errorMessage(err, "Share update failed");
      setActionError(msg);
      pushToast(msg, "error");
    }
  };

  const onDelete = async () => {
    if (!selectedId || !confirm("Delete this note?")) return;
    try {
      await deleteNote(selectedId);
      setSelectedId(null);
      navigate({ replace: true });
    } catch (err) {
      setActionError(errorMessage(err, "Delete failed"));
    }
  };


  if (!isSupabaseConfigured) {
    return (
      <div className="p-6 text-sm text-amber-200">
        Configure <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>.
      </div>
    );
  }

  if (authLoading) {
    return <div className="p-6 text-sm text-[var(--muted)]">Loading session…</div>;
  }

  if (!session) {
    return (
      <div className="notes-workspace anim-fade flex min-h-0 flex-col">
        <NotesHubChrome
          query={query}
          onQueryChange={setQuery}
          filterValues={filterValues}
          onFilterValuesChange={setFilterValues}
          notes={[]}
          shown={0}
          density={density}
          onDensityChange={setDensity}
        />
        <div className="pt-5">
          <NotesAuthGate variant="notes" />
        </div>
      </div>
    );
  }

  return (
    <div className="notes-workspace anim-fade flex min-h-0 flex-col">
      <NotesHubChrome
        query={query}
        onQueryChange={setQuery}
        filterValues={filterValues}
        onFilterValuesChange={setFilterValues}
        notes={notes}
        shown={filtered.length}
        density={density}
        onDensityChange={setDensity}
      />

      {listError ? (
        <p className="mx-0 mb-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200">
          {listError}
        </p>
      ) : null}

      <div className="notes-workspace__body flex min-h-0 flex-1 overflow-hidden">
        <NotesListRail
          notes={filtered}
          selectedId={selectedId}
          density={density}
          loading={listLoading}
          onSelect={pickNote}
        />
        {noteError && selectedId ? (
          <div className="flex flex-1 items-center justify-center p-6 text-sm text-rose-200">{noteError}</div>
        ) : (
          <NoteEditorPanel
            note={note}
            loading={noteLoading && Boolean(selectedId)}
            title={title}
            slug={slug}
            domain={domain}
            pinned={pinned}
            shareEnabled={shareEnabled}
            sharePassword={sharePassword}
            body={body}
            saving={saving}
            creating={creating}
            savedHint={savedHint}
            actionError={actionError}
            folders={folders.folders}
            currentFolderId={note ? (folders.noteFolders[note.id] ?? null) : null}
            folderFilterId={folders.filterId}
            onTitleChange={updateTitle}
            onPinnedToggle={() => void onPinnedToggle()}
            onShareToggle={() => void onShareToggle()}
            onSharePasswordChange={updateSharePassword}
            onBodyChange={updateBody}
            onNew={() => void onNew()}
            onSave={() => void onSave()}
            onDelete={() => void onDelete()}
            onSlugFromTitle={() => setSlug(slugifyTitle(title, slug))}
            onCreateFolder={async (name) => {
              const folder = await folders.createFolder(name);
              if (!folder) return;
              if (selectedId) await folders.assignNoteFolder(selectedId, folder.id);
              pushToast(`Folder created: ${folder.name}`, "success");
            }}
            onSelectFolder={async (folderId) => {
              if (!selectedId) return;
              await folders.assignNoteFolder(selectedId, folderId);
              const folder = folders.folders.find((f) => f.id === folderId);
              pushToast(folder ? `Moved to ${folder.name}` : "Removed from folder", "success");
            }}
            onFolderFilterChange={(folderId) => {
              folders.setFilterId(folderId);
              const folder = folders.folders.find((f) => f.id === folderId);
              pushToast(folder ? `Filtering: ${folder.name}` : "Showing all folders", "info");
            }}
            onRenameFolder={async (folderId, name) => {
              await folders.renameFolder(folderId, name);
              pushToast("Folder renamed", "success");
            }}
            onSetFolderColor={async (folderId, color) => {
              await folders.setFolderColor(folderId, color);
              pushToast("Folder color updated", "success");
            }}
            onDeleteFolder={async (folderId) => {
              await folders.deleteFolder(folderId);
              pushToast("Folder deleted", "success");
            }}
          />
        )}
      </div>
    </div>
  );
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
  return fallback;
}
