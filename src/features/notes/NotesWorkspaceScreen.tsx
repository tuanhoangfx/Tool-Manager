import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FilterValues } from "../../components/sales-shell";
import { ToolConfirmDialog } from "../../components/confirm/ToolConfirmDialog";
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
import { noteMatchesFolderFilter, useNoteFolders, mergeDisplayFolders, getEffectiveNoteFolderIds, getUserFolderIds } from "./noteFolders";
import { NotesFoldersSettingsPanel } from "./NotesFoldersSettingsPanel";
import { filterNotes } from "./notes-filters";
import { readNotesListPrefs, type NotesListDensity } from "./notes-list-prefs";
import { subscribeHubListPrefs } from "../../lib/url-prefs";
import { pathnameToNavScreen } from "../../lib/workspace-path";
import { shareAccessFromRow, shareFlagsFromAccess, type NoteShareAccess } from "./shareAccess";
import { cookieLines, slugifyTitle, sortNoteRows } from "./noteUtils";
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
  /** When false, do not sync URL note or auto-pick (avoids leaving 2FA on display prefs change). */
  tabActive?: boolean;
  navigate: (opts?: { note?: string; replace?: boolean }) => void;
};

export function NotesWorkspaceScreen({ tabActive = true, navigate }: Props) {
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
  const [shareAccess, setShareAccess] = useState<NoteShareAccess>("private");
  const [sharePassword, setSharePassword] = useState("");
  const [shareDraftAccess, setShareDraftAccess] = useState<NoteShareAccess>("private");
  const [shareDraftPassword, setShareDraftPassword] = useState("");
  const [savedHint, setSavedHint] = useState("");
  const [pendingDeleteNote, setPendingDeleteNote] = useState(false);
  const folders = useNoteFolders(session);
  const [dirty, setDirty] = useState(false);
  const [routeDetailDomain, setRouteDetailDomain] = useState<string | null>(null);
  const lastAutosaveKey = useRef("");
  const loadedEditorNoteId = useRef<string | null>(null);

  useEffect(() => {
    return subscribeHubListPrefs(() => {
      setPrefs(readNotesListPrefs());
      if (!tabActive) return;
      if (pathnameToNavScreen(window.location.pathname) !== "notes") return;
      setSelectedId(readNoteIdFromUrl());
    });
  }, [tabActive]);

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
        share_can_edit?: boolean;
        cookie_snapshot?: NoteRow["cookie_snapshot"];
      },
      opts?: { routeLocked?: boolean },
    ) => {
      const locked = opts?.routeLocked ?? false;
      const snapshotText = cookieLines(row.cookie_snapshot ?? null).join("\n");
      setTitle(row.title.trim() === "Note mới" ? "New note" : row.title);
      setSlug(row.slug);
      setDomain(row.domain);
      setBody(locked ? snapshotText : row.body_md);
      setPinned(row.pinned);
      setShareAccess(shareAccessFromRow(row));
      setSharePassword("");
    },
    [],
  );

  useEffect(() => {
    if (!listError) return;
    pushToast(listError, "error", 8000);
  }, [listError, pushToast]);

  useEffect(() => {
    if (!noteError || !selectedId) return;
    pushToast(noteError, "error", 8000);
  }, [noteError, pushToast, selectedId]);

  useEffect(() => {
    if (!note || !selectedId || note.id !== selectedId) return;
    const switchingNote = loadedEditorNoteId.current !== note.id;
    if (!switchingNote) return;
    loadedEditorNoteId.current = note.id;
    applyNoteToEditor(note, { routeLocked });
    setDirty(false);
  }, [applyNoteToEditor, note, routeLocked, selectedId]);

  useEffect(() => {
    if (!routeLocked || !note || note.id !== selectedId) return;
    setBody(cookieLines(note.cookie_snapshot).join("\n"));
  }, [note, routeLocked, selectedId]);

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
    setFilterValues((prev) => {
      const stored = folders.filterIds;
      const current = prev.folder ?? [];
      if (stored.length === current.length && stored.every((id, i) => id === current[i])) return prev;
      return { ...prev, folder: stored.length ? [...stored] : [] };
    });
  }, [folders.filterIds]);

  const handleFilterValuesChange = useCallback(
    (next: FilterValues) => {
      setFilterValues(next);
      if (Array.isArray(next.folder)) {
        folders.setFilterIds(next.folder);
      }
    },
    [folders],
  );

  const [folderTick, setFolderTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setFolderTick((t) => t + 1), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const cookieRouteNoteIds = useMemo(() => new Set(routeByNoteId.keys()), [routeByNoteId]);
  const displayFolders = useMemo(() => mergeDisplayFolders(folders.folders), [folders.folders]);

  const selectedNoteMeta = useMemo(() => {
    if (!selectedId) return null;
    const listItem = notes.find((n) => n.id === selectedId);
    return {
      id: selectedId,
      created_at: listItem?.created_at ?? note?.created_at ?? null,
    };
  }, [note?.created_at, notes, selectedId]);

  const selectedNoteFolderIds = useMemo(
    () =>
      selectedNoteMeta
        ? getEffectiveNoteFolderIds(
            selectedNoteMeta.id,
            folders.noteFolders,
            cookieRouteNoteIds,
            selectedNoteMeta.created_at,
          )
        : [],
    [cookieRouteNoteIds, folderTick, folders.noteFolders, selectedNoteMeta],
  );

  const selectedUserFolderIds = useMemo(
    () => (selectedId ? getUserFolderIds(selectedId, folders.noteFolders) : []),
    [folders.noteFolders, selectedId],
  );

  const filtered = useMemo(() => {
    const folderIds = filterValues.folder ?? [];
    const base = filterNotes(notes, query, filterValues, prefs.range, cookieRouteNoteIds);
    return base.filter((n) => noteMatchesFolderFilter(n, folders.noteFolders, folderIds, cookieRouteNoteIds));
  }, [cookieRouteNoteIds, filterValues, folderTick, folders.noteFolders, notes, prefs.range, query]);

  const sortedFiltered = useMemo(
    () => sortNoteRows(filtered, prefs.sort, cookieRouteNoteIds),
    [cookieRouteNoteIds, filtered, prefs.sort],
  );

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
              body_md: listItem.body_md ?? "",
              pinned: listItem.pinned,
              share_enabled: listItem.share_enabled,
              cookie_snapshot: listItem.cookie_snapshot,
            },
            { routeLocked: hasRoute },
          );
          setDirty(false);
        }
      }
      setSelectedId(id);
      if (tabActive) navigate({ note: id });
    },
    [applyNoteToEditor, navigate, notes, routeByNoteId, tabActive],
  );

  useEffect(() => {
    if (!tabActive) return;
    if (listLoading || creating) return;
    if (!selectedId) {
      if (sortedFiltered.length > 0) pickNote(sortedFiltered[0].id);
      return;
    }
    const stillExists = notes.some((n) => n.id === selectedId);
    if (!stillExists && sortedFiltered.length > 0) pickNote(sortedFiltered[0].id);
  }, [tabActive, creating, listLoading, sortedFiltered, notes, selectedId, pickNote]);

  const onNew = async () => {
    setCreating(true);
    try {
      const row = await createNote();
      pickNote(row.id, row);
    } catch (err) {
      const msg = errorMessage(err, "Could not create note");
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


  const buildEditorDraft = (overrides?: {
    pinned?: boolean;
    shareAccess?: NoteShareAccess;
    sharePassword?: string;
    contentOnly?: boolean;
  }) => {
    const nextPinned = routeLocked ? (note?.pinned ?? false) : (overrides?.pinned ?? pinned);
    const share =
      overrides?.contentOnly && note
        ? shareFlagsFromAccess(shareAccessFromRow(note))
        : shareFlagsFromAccess(overrides?.shareAccess ?? shareAccess);
    const pwd =
      overrides?.contentOnly || routeLocked
        ? undefined
        : overrides?.sharePassword !== undefined
          ? overrides.sharePassword || undefined
          : sharePassword || undefined;
    return {
      title,
      slug: slug.trim() || slugifyTitle(title, note?.slug || (selectedId ?? "note")),
      domain: routeLocked ? (note?.domain ?? domain) : domain,
      body_md: routeLocked ? (note?.body_md ?? body) : body,
      pinned: nextPinned,
      share_enabled: share.share_enabled,
      share_can_edit: share.share_can_edit,
      share_password: pwd,
    };
  };

  const persistCurrentNote = async (overrides?: {
    pinned?: boolean;
    shareAccess?: NoteShareAccess;
    contentOnly?: boolean;
  }) => {
    if (!selectedId) throw new Error("No note selected");
    const saved = await save(buildEditorDraft(overrides));
    setPinned(saved.pinned);
    setShareAccess(shareAccessFromRow(saved));
    setSlug(saved.slug);
    if (!overrides?.contentOnly) setSharePassword("");
    mergeNoteInList(stripSaveResult(saved));
    setSavedHint("Saved");
    setTimeout(() => setSavedHint(""), 2500);
    return saved;
  };

  const resetShareDraft = useCallback(() => {
    setShareDraftAccess(shareAccess);
    setShareDraftPassword("");
  }, [shareAccess]);

  const onShareSave = async () => {
    if (!selectedId || routeLocked) return;
    try {
      const saved = await save(
        buildEditorDraft({ shareAccess: shareDraftAccess, sharePassword: shareDraftPassword }),
      );
      setShareAccess(shareAccessFromRow(saved));
      setSharePassword("");
      setShareDraftAccess(shareAccessFromRow(saved));
      setShareDraftPassword("");
      mergeNoteInList(stripSaveResult(saved));
      pushToast("Share settings saved", "success");
    } catch (err) {
      pushToast(errorMessage(err, "Share update failed"), "error");
    }
  };

  const onSave = async () => {
    try {
      await persistCurrentNote();
      setDirty(false);
      pushToast("Note saved", "success");
    } catch (err) {
      pushToast(errorMessage(err, "Save failed"), "error");
    }
  };

  useEffect(() => {
    if (!dirty || !selectedId || saving || creating) return;
    const key = routeLocked
      ? `${selectedId}:${title}:${slug}`
      : `${selectedId}:${title}:${slug}:${domain}:${body}:${pinned}`;
    if (key === lastAutosaveKey.current) return;
    const timer = window.setTimeout(() => {
      lastAutosaveKey.current = key;
      void persistCurrentNote({ contentOnly: true })
        .then(() => {
          setDirty(false);
          setSavedHint("Saved");
          window.setTimeout(() => setSavedHint(""), 2500);
        })
        .catch((err) => {
          pushToast(errorMessage(err, "Autosave failed"), "error");
        });
    }, NOTES_AUTOSAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [body, creating, dirty, domain, pinned, pushToast, routeLocked, saving, selectedId, slug, title]);

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
      pushToast(errorMessage(err, "Pin update failed"), "error");
    }
  };

  const requestDeleteNote = () => {
    if (!selectedId) return;
    setPendingDeleteNote(true);
  };

  const confirmDeleteNote = async () => {
    if (!selectedId) return;
    setPendingDeleteNote(false);
    try {
      await deleteNote(selectedId);
      pushToast("Note deleted", "success");
      setSelectedId(null);
      navigate({ replace: true });
    } catch (err) {
      pushToast(errorMessage(err, "Delete failed"), "error");
    }
  };

  const deleteNoteTitle = title.trim() || note?.title?.trim() || "this note";
  const deleteNoteMessage = routeLocked ? (
    <>
      This note is linked to Cookie Auto route(s). Deleting <strong>{deleteNoteTitle}</strong> breaks sync. This cannot
      be undone.
    </>
  ) : (
    <>
      Remove <strong>{deleteNoteTitle}</strong> from your notes? This cannot be undone.
    </>
  );


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
          onFilterValuesChange={handleFilterValuesChange}
          notes={[]}
          noteFolders={displayFolders}
          cookieRouteNoteIds={cookieRouteNoteIds}
          shown={0}
          density={density}
          onDensityChange={setDensity}
          sort={prefs.sort}
          onSortChange={(next) => setPrefs((p) => ({ ...p, sort: next }))}
          filterToolbar={null}
        >
          <p className="px-4 py-8 text-center text-[12px] text-[var(--muted)]">Signing in…</p>
        </NotesHubChrome>
      </div>
    );
  }

  const folderSettingsPanel = session ? (
    <NotesFoldersSettingsPanel
      folders={displayFolders}
      noteFolders={folders.noteFolders}
      cookieRouteNoteIds={cookieRouteNoteIds}
      notes={notes}
      selectedNoteId={selectedId}
      selectedNoteFolderIds={selectedNoteFolderIds}
      onCreateFolder={async (name, color) => {
        const folder = await folders.createFolder(name, color);
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
      shareAccess={shareAccess}
      shareDraftAccess={shareDraftAccess}
      shareDraftPassword={shareDraftPassword}
      saving={saving}
      creating={creating}
      savedHint={savedHint}
      routeLocked={routeLocked}
      onNew={() => void onNew()}
      onSave={() => void onSave()}
      onDelete={requestDeleteNote}
      onPinnedToggle={() => void onPinnedToggle()}
      onShareMenuOpen={resetShareDraft}
      onShareDraftAccessChange={setShareDraftAccess}
      onShareDraftPasswordChange={setShareDraftPassword}
      onShareSave={() => void onShareSave()}
      onShareCancel={resetShareDraft}
    />
  ) : null;

  if (!session) {
    return (
      <div className="notes-workspace anim-fade flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <NotesHubChrome
          query={query}
          onQueryChange={setQuery}
          filterValues={filterValues}
          onFilterValuesChange={handleFilterValuesChange}
          notes={[]}
          cookieRouteNoteIds={cookieRouteNoteIds}
          shown={0}
          density={density}
          onDensityChange={setDensity}
          sort={prefs.sort}
          onSortChange={(next) => setPrefs((p) => ({ ...p, sort: next }))}
          filterToolbar={null}
          folderSettingsPanel={folderSettingsPanel}
        >
          <NotesAuthGate variant="notes" />
        </NotesHubChrome>
      </div>
    );
  }

  return (
    <div className="notes-workspace anim-fade flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <NotesHubChrome
        query={query}
        onQueryChange={setQuery}
        filterValues={filterValues}
        onFilterValuesChange={handleFilterValuesChange}
        notes={notes}
        noteFolders={displayFolders}
        cookieRouteNoteIds={cookieRouteNoteIds}
        shown={filtered.length}
        density={density}
        onDensityChange={setDensity}
        sort={prefs.sort}
        onSortChange={(next) => setPrefs((p) => ({ ...p, sort: next }))}
        filterToolbar={workspaceToolbar}
        folderSettingsPanel={folderSettingsPanel}
      >
        <NotesListRail
          notes={sortedFiltered}
          selectedId={selectedId}
          density={density}
          loading={listLoading}
          refreshing={listRefreshing}
          cookieRouteByNoteId={routeByNoteId}
          cookieRouteNoteIds={cookieRouteNoteIds}
          displayFolders={displayFolders}
          noteFolders={folders.noteFolders}
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
            routeLocked={routeLocked}
            routeInfos={routeInfos}
            folders={displayFolders}
            effectiveFolderIds={selectedNoteFolderIds}
            userFolderIds={selectedUserFolderIds}
            onUserFoldersChange={(ids) => {
              if (!selectedId) return;
              void folders.setUserNoteFolders(selectedId, ids);
            }}
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
      </NotesHubChrome>

      <ToolConfirmDialog
        open={pendingDeleteNote}
        title="Delete note?"
        message={deleteNoteMessage}
        confirmLabel="Delete note"
        onConfirm={() => void confirmDeleteNote()}
        onClose={() => setPendingDeleteNote(false)}
      />
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
