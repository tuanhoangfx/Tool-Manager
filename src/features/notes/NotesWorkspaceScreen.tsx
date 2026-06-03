import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FilterValues } from "../../components/sales-shell";
import { useAppToast } from "../../components/toast";
import { readNoteIdFromUrl } from "../design-preview/design-nav";
import { useNoteCookieRouteLock } from "../cookie/useNoteCookieRouteLock";
import { useNotesCookieRouteIndex } from "../cookie/useNotesCookieRouteIndex";
import { NoteEditorPanel } from "./NoteEditorPanel";
import { NotesRouteDetailOverlay } from "./NotesRouteDetailOverlay";
import { NotesHubChrome } from "./NotesHubChrome";
import { NotesWorkspaceToolbar } from "./NotesWorkspaceToolbar";
import { NotesListRail } from "./NotesListRail";
import { NotesAuthGate } from "./NotesAuthGate";
import { noteMatchesFolderFilter, useNoteFolders } from "./noteFolders";
import { NotesFoldersSettingsPanel } from "./NotesFoldersSettingsPanel";
import { filterNotes } from "./notes-filters";
import { readNotesListPrefs, type NotesListDensity } from "./notes-list-prefs";
import { slugifyTitle } from "./noteUtils";
import { NOTES_AUTOSAVE_DEBOUNCE_MS } from "./notes-egress";
import type { NoteRow } from "./types";
import type { NoteSaveResult } from "./useNote";
import { useNote } from "./useNote";
import { useNotes } from "./useNotes";
import { useNotesAuth } from "./useNotesAuth";
import { readNoteDetailStale, writeNoteDetailCache } from "../../lib/note-detail-cache";
import { readNoteRouteLockStale } from "../../lib/note-route-lock-cache";
import { prefetchCookieBootBackground } from "../../lib/hub-background-prefetch";
import {
  publishWorkspaceListRefreshing,
  WORKSPACE_REFRESH_REQUEST,
} from "../../lib/workspace-refresh-bus";

type Props = {
  navigate: (opts?: { note?: string; replace?: boolean }) => void;
};

export function NotesWorkspaceScreen({ navigate }: Props) {
  const { pushToast } = useAppToast();
  const { session, loading: authLoading, isSupabaseConfigured } = useNotesAuth();
  const {
    notes,
    loading: listLoading,
    refreshing: listRefreshing,
    error: listError,
    refresh: refreshNotesList,
    mergeNoteInList,
    createNote,
    deleteNote,
  } = useNotes(session);

  const [selectedId, setSelectedId] = useState(readNoteIdFromUrl);
  const { note, loading: noteLoading, error: noteError, saving, save, refresh: refreshNote } =
    useNote(session, selectedId);
  const { routeLocked, routeInfos, refreshRouteLock } = useNoteCookieRouteLock(session, selectedId);
  const { routeByNoteId } = useNotesCookieRouteIndex(session);

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
  const [routeDetailDomain, setRouteDetailDomain] = useState<string | null>(null);
  const lastAutosaveKey = useRef("");
  const loadedEditorNoteId = useRef<string | null>(null);

  useEffect(() => {
    const sync = () => {
      setPrefs(readNotesListPrefs());
      setSelectedId(readNoteIdFromUrl());
    };
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  useEffect(() => {
    if (!session) return;
    publishWorkspaceListRefreshing(listRefreshing);
    return () => publishWorkspaceListRefreshing(false);
  }, [listRefreshing, session]);

  useEffect(() => {
    if (!session) return;
    const onRefresh = () => void refreshNotesList({ silent: true });
    window.addEventListener(WORKSPACE_REFRESH_REQUEST, onRefresh);
    return () => window.removeEventListener(WORKSPACE_REFRESH_REQUEST, onRefresh);
  }, [refreshNotesList, session]);

  useEffect(() => {
    if (!session) return;
    const warm = () => prefetchCookieBootBackground();
    const idle = window.requestIdleCallback?.(warm, { timeout: 4000 });
    if (idle == null) {
      const t = window.setTimeout(warm, 1200);
      return () => window.clearTimeout(t);
    }
    return () => window.cancelIdleCallback(idle);
  }, [session]);

  const applyNoteToEditor = useCallback(
    (
      row: {
        id: string;
        title: string;
        slug: string;
        domain: string;
        body_md: string;
        pinned: boolean;
        share_enabled: boolean;
      },
      opts?: { routeLocked?: boolean },
    ) => {
      const locked = opts?.routeLocked ?? false;
      setTitle(row.title.trim() === "Note mới" ? "New note" : row.title);
      setSlug(row.slug);
      setDomain(row.domain);
      setBody(locked ? "" : row.body_md);
      setPinned(row.pinned);
      setShareEnabled(row.share_enabled);
      setSharePassword("");
      setActionError("");
    },
    [],
  );

  useEffect(() => {
    if (!note || !selectedId || note.id !== selectedId) return;
    const switchingNote = loadedEditorNoteId.current !== note.id;
    if (!switchingNote) return;
    loadedEditorNoteId.current = note.id;
    applyNoteToEditor(note, { routeLocked });
    setDirty(false);
  }, [applyNoteToEditor, note, routeLocked, selectedId]);

  useEffect(() => {
    if (!session) return;
    const pullFromCloud = () => {
      void refreshNotesList({ silent: true });
      if (selectedId) void refreshNote({ silent: true });
      if (routeLocked) void refreshRouteLock();
    };
    const onFocus = () => pullFromCloud();
    const onVisible = () => {
      if (document.visibilityState === "visible") pullFromCloud();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [session, selectedId, routeLocked, refreshNotesList, refreshNote, refreshRouteLock]);

  useEffect(() => {
    if (!routeLocked || dirty) return;
    setBody("");
  }, [routeLocked, selectedId, dirty]);

  const filtered = useMemo(() => {
    const base = filterNotes(notes, query, filterValues, prefs.range);
    return base.filter((n) => noteMatchesFolderFilter(folders.noteFolders, n.id, folders.filterIds));
  }, [filterValues, folders.filterIds, folders.noteFolders, notes, prefs.range, query]);

  const pickNote = useCallback(
    (id: string, seed?: NoteRow | null) => {
      const hasRoute =
        routeByNoteId.has(id) || (readNoteRouteLockStale(id)?.length ?? 0) > 0;
      const cached = seed ?? readNoteDetailStale(id);
      if (cached) {
        loadedEditorNoteId.current = id;
        applyNoteToEditor(cached, { routeLocked: hasRoute });
        setDirty(false);
        if (!seed) writeNoteDetailCache(id, cached);
      } else {
        loadedEditorNoteId.current = null;
        const listItem = notes.find((n) => n.id === id);
        if (listItem) {
          applyNoteToEditor(
            {
              id: listItem.id,
              title: listItem.title,
              slug: listItem.slug,
              domain: listItem.domain,
              body_md: "",
              pinned: listItem.pinned,
              share_enabled: listItem.share_enabled,
            },
            { routeLocked: hasRoute },
          );
          setDirty(false);
        }
      }
      setSelectedId(id);
      navigate({ note: id });
    },
    [applyNoteToEditor, navigate, notes, routeByNoteId],
  );

  useEffect(() => {
    if (listLoading || creating) return;
    if (!selectedId) {
      if (filtered.length > 0) pickNote(filtered[0].id);
      return;
    }
    const stillExists = notes.some((n) => n.id === selectedId);
    if (!stillExists && filtered.length > 0) pickNote(filtered[0].id);
  }, [creating, listLoading, filtered, notes, selectedId, pickNote]);

  const onNew = async () => {
    setCreating(true);
    setActionError("");
    try {
      const row = await createNote();
      pickNote(row.id, row);
    } catch (err) {
      const msg = errorMessage(err, "Could not create note");
      setActionError(msg);
      pushToast(`New note failed: ${msg}`, "error", 8000);
    } finally {
      setCreating(false);
    }
  };

  const updateTitle = (next: string) => {
    setTitle(next);
    setDirty(true);
  };

  const updateBody = (next: string) => {
    if (routeLocked) return;
    setBody(next);
    setDirty(true);
  };

  const updateSharePassword = (next: string) => {
    if (routeLocked) return;
    setSharePassword(next);
    setDirty(true);
  };

  const persistCurrentNote = async (overrides?: {
    pinned?: boolean;
    shareEnabled?: boolean;
  }) => {
    if (!selectedId) throw new Error("No note selected");
    setActionError("");
    const nextPinned = routeLocked ? (note?.pinned ?? false) : (overrides?.pinned ?? pinned);
    const nextShareEnabled = routeLocked ? (note?.share_enabled ?? false) : (overrides?.shareEnabled ?? shareEnabled);
    const saved = await save({
      title,
      slug: slug.trim() || slugifyTitle(title, note?.slug || selectedId),
      domain: routeLocked ? (note?.domain ?? domain) : domain,
      body_md: routeLocked ? (note?.body_md ?? body) : body,
      pinned: nextPinned,
      share_enabled: nextShareEnabled,
      share_password: routeLocked ? undefined : sharePassword || undefined,
    });
    setPinned(saved.pinned);
    setShareEnabled(saved.share_enabled);
    setSlug(saved.slug);
    setSharePassword("");
    mergeNoteInList(stripSaveResult(saved));
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
    const key = routeLocked
      ? `${selectedId}:${title}:${slug}`
      : `${selectedId}:${title}:${slug}:${domain}:${body}:${pinned}:${shareEnabled}:${sharePassword}`;
    if (key === lastAutosaveKey.current) return;
    const timer = window.setTimeout(() => {
      lastAutosaveKey.current = key;
      void persistCurrentNote()
        .then(() => {
          setDirty(false);
          setSavedHint("Saved");
          window.setTimeout(() => setSavedHint(""), 2500);
        })
        .catch((err) => {
          const msg = errorMessage(err, "Autosave failed");
          setActionError(msg);
          pushToast(msg, "error");
        });
    }, NOTES_AUTOSAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [body, creating, dirty, domain, pinned, pushToast, routeLocked, saving, selectedId, shareEnabled, sharePassword, slug, title]);

  const onPinnedToggle = async () => {
    if (routeLocked) {
      pushToast("Pin is disabled while a Cookie Auto route is active.", "info");
      return;
    }
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
    if (routeLocked) {
      pushToast("Share is disabled while a Cookie Auto route is active.", "info");
      return;
    }
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
    if (!selectedId) return;
    const msg = routeLocked
      ? "This note is linked to Cookie Auto route(s). Deleting it breaks sync. Delete anyway?"
      : "Delete this note?";
    if (!confirm(msg)) return;
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

  if (!session && authLoading) {
    return (
      <div className="notes-workspace anim-fade flex min-h-0 flex-1 flex-col">
        <NotesHubChrome
          query={query}
          onQueryChange={setQuery}
          filterValues={filterValues}
          onFilterValuesChange={setFilterValues}
          notes={[]}
          shown={0}
          density={density}
          onDensityChange={setDensity}
          filterToolbar={null}
        />
        <p className="px-4 py-8 text-center text-[12px] text-[var(--muted)]">Signing in…</p>
      </div>
    );
  }

  const folderSettingsPanel = session ? (
    <NotesFoldersSettingsPanel
      folders={folders.folders}
      selectedNoteId={selectedId}
      selectedNoteFolderIds={selectedId ? (folders.noteFolders[selectedId] ?? []) : []}
      routeLocked={routeLocked}
      onCreateFolder={async (name) => {
        const folder = await folders.createFolder(name);
        if (folder) pushToast(`Folder created: ${folder.name}`, "success");
      }}
      onToggleNoteFolder={async (folderId, enabled) => {
        if (!selectedId) return;
        await folders.toggleNoteFolder(selectedId, folderId, enabled);
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
  ) : null;

  const workspaceToolbar = session ? (
    <NotesWorkspaceToolbar
      note={note}
      pinned={pinned}
      shareEnabled={shareEnabled}
      sharePassword={sharePassword}
      saving={saving}
      creating={creating}
      savedHint={savedHint}
      routeLocked={routeLocked}
      folders={folders.folders}
      folderFilterIds={folders.filterIds}
      onNew={() => void onNew()}
      onSave={() => void onSave()}
      onDelete={() => void onDelete()}
      onPinnedToggle={() => void onPinnedToggle()}
      onShareToggle={() => void onShareToggle()}
      onSharePasswordChange={updateSharePassword}
      onToggleFolderFilter={(folderId) => {
        folders.toggleFilterId(folderId);
      }}
      onClearFolderFilter={() => folders.clearFilterIds()}
    />
  ) : null;

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
          filterToolbar={null}
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
        filterToolbar={workspaceToolbar}
        folderSettingsPanel={folderSettingsPanel}
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
          refreshing={listRefreshing}
          cookieRouteByNoteId={routeByNoteId}
          onSelect={pickNote}
        />
        {noteError && selectedId ? (
          <div className="flex flex-1 items-center justify-center p-6 text-sm text-rose-200">{noteError}</div>
        ) : (
          <NoteEditorPanel
            note={
              note?.id === selectedId
                ? note
                : selectedId
                  ? readNoteDetailStale(selectedId)
                  : null
            }
            loading={Boolean(
              selectedId && !readNoteDetailStale(selectedId) && note?.id !== selectedId && noteLoading,
            )}
            title={title}
            body={body}
            actionError={actionError}
            routeLocked={routeLocked}
            routeInfos={routeInfos}
            onOpenRouteDetail={(domain) => setRouteDetailDomain(domain)}
            onTitleChange={updateTitle}
            onBodyChange={updateBody}
            onSlugFromTitle={() => setSlug(slugifyTitle(title, slug))}
          />
        )}
        {session && note && routeDetailDomain ? (
          <NotesRouteDetailOverlay
            session={session}
            note={note}
            routeDomain={routeDetailDomain}
            routeInfos={routeInfos}
            onClose={() => setRouteDetailDomain(null)}
          />
        ) : null}
      </div>
    </div>
  );
}

function stripSaveResult(saved: NoteSaveResult) {
  const { passMigrationHint: _hint, ...row } = saved;
  return row;
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
  return fallback;
}
