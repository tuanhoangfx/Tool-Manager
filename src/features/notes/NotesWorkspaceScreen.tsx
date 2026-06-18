import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHubPageShortcuts } from "@tool-workspace/hub-ui";
import type { FilterValues } from "../../components/sales-shell";
import { ToolConfirmDialog } from "../../components/confirm/ToolConfirmDialog";
import { useAppToast } from "../../components/toast";
import { readNoteIdFromUrl } from "../../lib/note-url";
import { removeBindingsForNote } from "../cookie/cookieBridge";
import { useNoteCookieRouteLock } from "../cookie/useNoteCookieRouteLock";
import { useNotesCookieRouteIndex } from "../cookie/useNotesCookieRouteIndex";
import { NoteEditorPanel } from "./NoteEditorPanel";
import { NoteHistoryModal } from "./NoteHistoryModal";
import {
  clearNoteVersionDetailCache,
  ensureFullNoteVersion,
  invalidateNoteVersionDetailCache,
  prefetchHistoryVersions,
} from "./noteVersionDetailCache";
import { NotesRouteDetailOverlay } from "./NotesRouteDetailOverlay";
import { NotesHubChrome } from "./NotesHubChrome";
import { NotesWorkspaceToolbar } from "./NotesWorkspaceToolbar";
import { NotesListRail } from "./NotesListRail";
import { noteMatchesFolderFilter, useNoteFolders, mergeDisplayFolders, getEffectiveNoteFolderIds, getUserFolderIds } from "./noteFolders";
import { NotesFoldersSettingsPanel } from "./NotesFoldersSettingsPanel";
import { filterNotes } from "./notes-filters";
import { readNotesListPrefs, type NotesListDensity } from "./notes-list-prefs";
import { subscribeHubListPrefs } from "../../lib/url-prefs";
import { pathnameToNavScreen } from "../../lib/workspace-path";
import { shareAccessFromRow, shareFlagsFromAccess, type NoteShareAccess } from "./shareAccess";
import { cookieLines, slugifyTitle, sortNoteRows } from "./noteUtils";
import { useNotesVersionIntervalMinutes } from "./NotesVersionIntervalSettings";
import { notesVersionIntervalMs } from "./notes-version-prefs";
import { useNotesAutosaveDebounceMs } from "./NotesAutosaveSettings";
import type { NoteRow } from "./types";
import type { NoteSaveResult } from "./useNote";
import { useNote } from "./useNote";
import { useNoteVersions } from "./useNoteVersions";
import { useNotes } from "./useNotes";
import { useNotesAuth } from "./AuthSessionProvider";
import { readNoteDetailStale, removeNoteDetailCache, writeNoteDetailCache } from "../../lib/note-detail-cache";
import { removeNoteRouteLockCache } from "../../lib/note-route-lock-cache";
import { prefetchNoteDetailBatch } from "./noteDetailPrefetch";
import { readNoteRouteLockStale } from "../../lib/note-route-lock-cache";
import { prefetchCookieBootBackground } from "../../lib/hub-background-prefetch";
import { getOfflineMode } from "../../lib/offlineMode";
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
  const [saveAcknowledged, setSaveAcknowledged] = useState(false);
  const pulseSaveAck = useCallback(() => {
    setSaveAcknowledged(true);
    window.setTimeout(() => setSaveAcknowledged(false), 2500);
  }, []);
  const [pendingDeleteNote, setPendingDeleteNote] = useState(false);
  const [deletingNote, setDeletingNote] = useState(false);
  const folders = useNoteFolders(session);
  const [dirty, setDirty] = useState(false);
  const [routeDetailDomain, setRouteDetailDomain] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyBadgePulse, setHistoryBadgePulse] = useState(false);
  const pulseHistoryBadgeOnSnapshot = useCallback((res: { created?: boolean }) => {
    if (!res?.created) return;
    setHistoryBadgePulse(true);
    window.setTimeout(() => setHistoryBadgePulse(false), 2500);
  }, []);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [pendingRestoreVersionId, setPendingRestoreVersionId] = useState<string | null>(null);
  const [pendingDeleteVersionId, setPendingDeleteVersionId] = useState<string | null>(null);
  const lastAutosaveKey = useRef("");
  const loadedEditorNoteId = useRef<string | null>(null);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const persistNoteRef = useRef<
    (overrides?: { pinned?: boolean; shareAccess?: NoteShareAccess; contentOnly?: boolean }) => Promise<NoteSaveResult>
  >(() => Promise.reject(new Error("Not ready")));

  const versionsActive = Boolean(selectedId) && !getOfflineMode();
  const {
    versions,
    loading: versionsLoading,
    restoring: versionRestoring,
    removing: versionRemoving,
    sessionSnapshot,
    saveSnapshot,
    intervalSnapshot,
    restore: restoreVersion,
    remove: removeVersion,
  } = useNoteVersions(selectedId, { active: versionsActive });
  const versionIntervalMinutes = useNotesVersionIntervalMinutes();
  const autosaveDebounceMs = useNotesAutosaveDebounceMs();

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
    setSelectedVersionId(null);
    if (!selectedId) setHistoryOpen(false);
    clearNoteVersionDetailCache();
  }, [selectedId]);

  useEffect(() => {
    if (!versions.length) {
      setSelectedVersionId(null);
      return;
    }
    setSelectedVersionId((prev) => (prev && versions.some((v) => v.id === prev) ? prev : versions[0].id));
  }, [versions]);

  useEffect(() => {
    if (!selectedVersionId || !versions.length) return;
    prefetchHistoryVersions(versions, selectedVersionId);
  }, [selectedVersionId, versions]);

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
    const base = filterNotes(notes, query, filterValues, prefs, cookieRouteNoteIds);
    return base.filter((n) => noteMatchesFolderFilter(n, folders.noteFolders, folderIds, cookieRouteNoteIds));
  }, [cookieRouteNoteIds, filterValues, folderTick, folders.noteFolders, notes, prefs, query]);

  const sortedFiltered = useMemo(
    () => sortNoteRows(filtered, prefs.sort, cookieRouteNoteIds),
    [cookieRouteNoteIds, filtered, prefs.sort],
  );

  useEffect(() => {
    if (!tabActive || listLoading || sortedFiltered.length === 0) return;
    const warm = () => {
      const ids = sortedFiltered
        .slice(0, 8)
        .map((n) => n.id)
        .filter((id) => id !== selectedId);
      prefetchNoteDetailBatch(ids);
    };
    const idle = window.requestIdleCallback?.(warm, { timeout: 1500 });
    if (idle == null) {
      const t = window.setTimeout(warm, 300);
      return () => window.clearTimeout(t);
    }
    return () => window.cancelIdleCallback(idle);
  }, [listLoading, selectedId, sortedFiltered, tabActive]);

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
    showSaveAck?: boolean;
  }) => {
    if (!selectedId) throw new Error("No note selected");
    const saved = await save(buildEditorDraft(overrides));
    setPinned(saved.pinned);
    setShareAccess(shareAccessFromRow(saved));
    setSlug(saved.slug);
    if (!overrides?.contentOnly) setSharePassword("");
    mergeNoteInList(stripSaveResult(saved));
    if (overrides?.showSaveAck) pulseSaveAck();
    return saved;
  };
  persistNoteRef.current = persistCurrentNote;

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

  const checkpointLeavingNote = useCallback(
    async (prevId: string) => {
      if (!prevId || getOfflineMode()) return;
      try {
        if (dirty) {
          await persistCurrentNote({ contentOnly: true });
          setDirty(false);
        }
      } catch {
        /* non-blocking when switching notes */
      }
      void sessionSnapshot(prevId)
        .then(pulseHistoryBadgeOnSnapshot)
        .catch(() => {});
    },
    [dirty, persistCurrentNote, pulseHistoryBadgeOnSnapshot, sessionSnapshot],
  );

  const pickNote = useCallback(
    async (id: string, seed?: NoteRow | null) => {
      const prevId = selectedId;
      if (prevId && prevId !== id) {
        await checkpointLeavingNote(prevId);
      }

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
    [applyNoteToEditor, checkpointLeavingNote, navigate, notes, routeByNoteId, selectedId, tabActive],
  );

  useEffect(() => {
    if (!tabActive) return;
    if (listLoading || creating) return;
    if (!selectedId) {
      if (sortedFiltered.length > 0) void pickNote(sortedFiltered[0].id);
      return;
    }
    const stillExists = notes.some((n) => n.id === selectedId);
    if (!stillExists && sortedFiltered.length > 0) void pickNote(sortedFiltered[0].id);
  }, [tabActive, creating, listLoading, sortedFiltered, notes, selectedId, pickNote]);

  const onNew = useCallback(async () => {
    setCreating(true);
    try {
      const row = await createNote();
      await pickNote(row.id, row);
    } catch (err) {
      const msg = errorMessage(err, "Could not create note");
      pushToast(`New note failed: ${msg}`, "error", 8000);
    } finally {
      setCreating(false);
    }
  }, [createNote, pickNote, pushToast]);

  useHubPageShortcuts("notes", {
    onNew,
    canNew: () => tabActive && !creating && !authLoading && Boolean(session),
  });

  const requestRestoreVersion = () => {
    if (!selectedVersionId) return;
    setPendingRestoreVersionId(selectedVersionId);
  };

  const confirmRestoreVersion = async () => {
    if (!pendingRestoreVersionId || !selectedId) return;
    const versionId = pendingRestoreVersionId;
    const listItem = versions.find((v) => v.id === versionId);
    setPendingRestoreVersionId(null);
    try {
      await ensureFullNoteVersion(versionId, listItem);
      const res = await restoreVersion(versionId);
      if (res.note) {
        applyNoteToEditor(
          {
            id: res.note.id,
            title: res.note.title,
            slug: res.note.slug,
            domain: note?.domain ?? domain,
            body_md: res.note.body_md,
            pinned: note?.pinned ?? pinned,
            share_enabled: note?.share_enabled ?? false,
            share_can_edit: note?.share_can_edit,
            cookie_snapshot: note?.cookie_snapshot,
          },
          { routeLocked },
        );
        setTitle(res.note.title);
        setBody(res.note.body_md);
        setDirty(false);
        mergeNoteInList(
          note
            ? { ...note, title: res.note.title, body_md: res.note.body_md, updated_at: res.note.updated_at }
            : ({ id: res.note.id, title: res.note.title, body_md: res.note.body_md, updated_at: res.note.updated_at } as NoteRow),
        );
        void refreshNote({ silent: true });
        setHistoryOpen(false);
        pushToast("Version restored", "success");
      }
    } catch (err) {
      pushToast(errorMessage(err, "Restore failed"), "error");
    }
  };

  const requestDeleteVersion = () => {
    if (!selectedVersionId) return;
    setPendingDeleteVersionId(selectedVersionId);
  };

  const confirmDeleteVersion = async () => {
    if (!pendingDeleteVersionId || !selectedId) return;
    const deletedId = pendingDeleteVersionId;
    const prevIdx = versions.findIndex((v) => v.id === deletedId);
    setPendingDeleteVersionId(null);
    try {
      await removeVersion(deletedId);
      invalidateNoteVersionDetailCache(deletedId);
      const remaining = versions.filter((v) => v.id !== deletedId);
      if (remaining.length === 0) {
        setSelectedVersionId(null);
      } else {
        const nextIdx = Math.min(Math.max(prevIdx, 0), remaining.length - 1);
        setSelectedVersionId(remaining[nextIdx]?.id ?? remaining[0].id);
      }
      pushToast("Snapshot deleted", "success");
    } catch (err) {
      pushToast(errorMessage(err, "Delete failed"), "error");
    }
  };

  const onSave = async () => {
    try {
      await persistCurrentNote({ showSaveAck: true });
      setDirty(false);
      let msg = "Note saved";
      if (selectedId && !routeLocked && !getOfflineMode()) {
        const snap = await saveSnapshot();
        if (snap.created) {
          msg = "Note saved · snapshot added";
          pulseHistoryBadgeOnSnapshot(snap);
        }
      }
      pushToast(msg, "success");
    } catch (err) {
      pushToast(errorMessage(err, "Save failed"), "error");
    }
  };

  useEffect(() => {
    if (!selectedId || !tabActive || !versionsActive || routeLocked) return;

    const tick = () => {
      void (async () => {
        try {
          if (dirtyRef.current) {
            await persistNoteRef.current({ contentOnly: true });
            setDirty(false);
          }
          const snap = await intervalSnapshot();
          pulseHistoryBadgeOnSnapshot(snap);
        } catch {
          /* non-blocking periodic snapshot */
        }
      })();
    };

    const timer = window.setInterval(tick, notesVersionIntervalMs(versionIntervalMinutes));
    return () => window.clearInterval(timer);
  }, [
    intervalSnapshot,
    pulseHistoryBadgeOnSnapshot,
    routeLocked,
    selectedId,
    tabActive,
    versionIntervalMinutes,
    versionsActive,
  ]);

  useEffect(() => {
    if (!tabActive || !dirty || !selectedId || saving || creating) return;
    const key = routeLocked
      ? `${selectedId}:${title}:${slug}`
      : `${selectedId}:${title}:${slug}:${domain}:${body}:${pinned}`;
    if (key === lastAutosaveKey.current) return;
    const timer = window.setTimeout(() => {
      lastAutosaveKey.current = key;
      void persistCurrentNote({ contentOnly: true, showSaveAck: true })
        .then(() => {
          setDirty(false);
        })
        .catch((err) => {
          pushToast(errorMessage(err, "Autosave failed"), "error");
        });
    }, autosaveDebounceMs);
    return () => window.clearTimeout(timer);
  }, [
    autosaveDebounceMs,
    body,
    creating,
    dirty,
    domain,
    pinned,
    pushToast,
    routeLocked,
    saving,
    selectedId,
    slug,
    tabActive,
    title,
  ]);

  const onPinnedToggle = async () => {
    if (routeLocked) {
      pushToast("Pin is disabled while a Cookie Bridge route is active.", "info");
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
    if (!selectedId || deletingNote) return;
    const id = selectedId;
    setDeletingNote(true);
    try {
      const result = await deleteNote(id);
      const localBindingsRemoved = removeBindingsForNote(id);
      removeNoteDetailCache(id);
      removeNoteRouteLockCache(id);
      const bridgeRemoved = result.bridge_routes_removed;
      if (bridgeRemoved > 0 && localBindingsRemoved > 0) {
        pushToast(
          `Note deleted. ${bridgeRemoved} cloud route${bridgeRemoved === 1 ? "" : "s"} and ${localBindingsRemoved} local binding${localBindingsRemoved === 1 ? "" : "s"} removed.`,
          "success",
          7000,
        );
      } else if (bridgeRemoved > 0) {
        pushToast(
          `Note deleted. ${bridgeRemoved} Cookie Bridge route${bridgeRemoved === 1 ? "" : "s"} removed.`,
          "success",
          6000,
        );
      } else if (localBindingsRemoved > 0) {
        pushToast(
          `Note deleted. ${localBindingsRemoved} local Cookie Bridge binding${localBindingsRemoved === 1 ? "" : "s"} removed.`,
          "success",
          6000,
        );
      } else {
        pushToast("Note deleted", "success");
      }
      setPendingDeleteNote(false);
      setSelectedId(null);
      navigate({ replace: true });
    } catch (err) {
      pushToast(errorMessage(err, "Delete failed"), "error");
    } finally {
      setDeletingNote(false);
    }
  };

  const deleteNoteTitle = title.trim() || note?.title?.trim() || "this note";
  const deleteNoteMessage = routeLocked ? (
    <>
      This note is linked to Cookie Bridge route(s). Deleting <strong>{deleteNoteTitle}</strong> removes cloud sync
      routes and cannot be undone.
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
      saveAcknowledged={saveAcknowledged}
      routeLocked={routeLocked}
      historyOpen={historyOpen}
      historyDisabled={getOfflineMode()}
      historyVersionCount={versions.length}
      historyBadgePulse={historyBadgePulse}
      onNew={() => void onNew()}
      onSave={() => void onSave()}
      onDelete={requestDeleteNote}
      onPinnedToggle={() => void onPinnedToggle()}
      onHistoryHover={() => {
        if (getOfflineMode() || !versions.length) return;
        prefetchHistoryVersions(versions, selectedVersionId);
      }}
      onHistoryToggle={() => {
        prefetchHistoryVersions(versions, selectedVersionId);
        setHistoryOpen(true);
      }}
      onShareMenuOpen={resetShareDraft}
      onShareDraftAccessChange={setShareDraftAccess}
      onShareDraftPasswordChange={setShareDraftPassword}
      onShareSave={() => void onShareSave()}
      onShareCancel={resetShareDraft}
    />
  ) : null;

  if (!session) return null;

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

      {selectedId ? (
        <NoteHistoryModal
          open={historyOpen}
          noteTitle={title}
          currentTitle={title}
          currentBody={body}
          versions={versions}
          loading={versionsLoading}
          restoring={versionRestoring}
          deleting={versionRemoving}
          selectedId={selectedVersionId}
          onSelect={setSelectedVersionId}
          onRestore={requestRestoreVersion}
          onDelete={requestDeleteVersion}
          onClose={() => setHistoryOpen(false)}
        />
      ) : null}

      <ToolConfirmDialog
        open={pendingDeleteNote}
        title="Delete note?"
        message={deleteNoteMessage}
        confirmLabel={deletingNote ? "Deleting…" : "Delete note"}
        onConfirm={() => void confirmDeleteNote()}
        onClose={() => {
          if (deletingNote) return;
          setPendingDeleteNote(false);
        }}
      />

      <ToolConfirmDialog
        open={Boolean(pendingRestoreVersionId)}
        title="Restore version?"
        message={
          <>
            Replace the current note with the selected snapshot? A pre-restore backup is saved automatically.
          </>
        }
        confirmLabel="Restore"
        onConfirm={() => void confirmRestoreVersion()}
        onClose={() => setPendingRestoreVersionId(null)}
      />

      <ToolConfirmDialog
        open={Boolean(pendingDeleteVersionId)}
        title="Delete?"
        message="Remove this snapshot from history? The current note is not changed."
        confirmLabel="Delete"
        onConfirm={() => void confirmDeleteVersion()}
        onClose={() => setPendingDeleteVersionId(null)}
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
