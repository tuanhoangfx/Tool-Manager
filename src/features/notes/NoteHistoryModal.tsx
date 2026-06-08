import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GitCompare, RotateCcw, Trash2 } from "lucide-react";
import {
  HubToolDetailModal,
  HubToolDetailModalPrimaryAction,
} from "@tool-workspace/hub-ui";
import {
  isSnapshotPartial,
  listItemToDetail,
  loadNoteVersion,
  peekNoteVersion,
  prefetchNoteVersion,
  prefetchNoteVersionPair,
  versionNeedsFullBody,
} from "./noteVersionDetailCache";
import { diffSideBySideWithWords } from "./noteVersionLineDiff";
import {
  CompareModeToggle,
  DiffLegend,
  SideBySideDiffPanes,
  countDiffStats,
  countWordDiffStats,
  type NoteHistoryCompareMode,
} from "./noteHistoryDiffUi";
import {
  formatNoteVersionTime,
  type NoteVersionDetail,
  type NoteVersionListItem,
} from "./noteVersionUtils";
import { NoteHistoryInspectorRail, NoteHistorySnapshotRail } from "./noteHistoryTocRails";
import { useNotesVersionIntervalMinutes } from "./NotesVersionIntervalSettings";
import "./note-history-modal.css";

type Props = {
  open: boolean;
  noteTitle: string;
  currentTitle: string;
  currentBody: string;
  versions: NoteVersionListItem[];
  loading?: boolean;
  restoring?: boolean;
  deleting?: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRestore: () => void;
  onDelete: () => void;
  onClose: () => void;
};

function snapshotBody(detail: NoteVersionDetail | null, listItem: NoteVersionListItem | null | undefined) {
  return detail?.body_md ?? listItem?.body_md ?? "";
}

/** Design V4 — Inspector Rail · emoji TOC · dual-pane compare. */
export function NoteHistoryModal({
  open,
  noteTitle,
  currentBody,
  versions,
  loading,
  restoring,
  deleting,
  selectedId,
  onSelect,
  onRestore,
  onDelete,
  onClose,
}: Props) {
  const autoIntervalMin = useNotesVersionIntervalMinutes();
  const displayTitle = noteTitle.trim() || "Untitled";

  const [detail, setDetail] = useState<NoteVersionDetail | null>(null);
  const [previousDetail, setPreviousDetail] = useState<NoteVersionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [previousLoading, setPreviousLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [compareMode, setCompareMode] = useState<NoteHistoryCompareMode>("previous");
  const wasOpenRef = useRef(false);

  const previousVersionId = useMemo(() => {
    if (!selectedId) return null;
    const idx = versions.findIndex((v) => v.id === selectedId);
    if (idx < 0 || idx >= versions.length - 1) return null;
    return versions[idx + 1]?.id ?? null;
  }, [selectedId, versions]);

  const selectedListItem = useMemo(
    () => versions.find((v) => v.id === selectedId) ?? null,
    [selectedId, versions],
  );

  const previousListItem = useMemo(
    () => (previousVersionId ? versions.find((v) => v.id === previousVersionId) ?? null : null),
    [previousVersionId, versions],
  );

  const hydrateDetail = useCallback(
    (versionId: string, listItem: NoteVersionListItem | null | undefined) => {
      return peekNoteVersion(versionId) ?? (listItem ? listItemToDetail(listItem) : null);
    },
    [],
  );

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setCompareMode(previousVersionId ? "previous" : "current");
    }
    wasOpenRef.current = open;
  }, [open, previousVersionId]);

  useEffect(() => {
    if (!open || !selectedId) return;
    prefetchNoteVersionPair(selectedId, previousVersionId);
  }, [open, selectedId, previousVersionId]);

  useEffect(() => {
    if (!open || !selectedId) {
      setDetail(null);
      setDetailError("");
      setDetailLoading(false);
      return;
    }

    const instant = hydrateDetail(selectedId, selectedListItem);
    if (instant) setDetail(instant);

    if (!versionNeedsFullBody(selectedListItem)) {
      setDetailLoading(false);
      return;
    }

    let cancelled = false;
    if (!instant) setDetailLoading(true);
    setDetailError("");
    void loadNoteVersion(selectedId)
      .then((row) => {
        if (!cancelled) setDetail(row);
      })
      .catch((err) => {
        if (!cancelled) {
          setDetail(null);
          setDetailError(err instanceof Error ? err.message : "Could not load snapshot");
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hydrateDetail, open, selectedId, selectedListItem]);

  useEffect(() => {
    if (!open || !previousVersionId) {
      setPreviousDetail(null);
      setPreviousLoading(false);
      return;
    }

    const instant = hydrateDetail(previousVersionId, previousListItem);
    if (instant) setPreviousDetail(instant);

    if (!versionNeedsFullBody(previousListItem)) {
      setPreviousLoading(false);
      return;
    }

    let cancelled = false;
    if (!instant) setPreviousLoading(true);
    void loadNoteVersion(previousVersionId)
      .then((row) => {
        if (!cancelled) setPreviousDetail(row);
      })
      .catch(() => {
        if (!cancelled) setPreviousDetail(null);
      })
      .finally(() => {
        if (!cancelled) setPreviousLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hydrateDetail, open, previousListItem, previousVersionId]);

  const vsCurrent = compareMode === "current";
  const selectedBody = snapshotBody(detail, selectedListItem);
  const previousBody = snapshotBody(previousDetail, previousListItem);
  const leftBody = vsCurrent ? currentBody : selectedBody;
  const rightBody = vsCurrent ? selectedBody : previousBody;
  const diffRows = useMemo(() => diffSideBySideWithWords(rightBody, leftBody), [leftBody, rightBody]);
  const stats = useMemo(() => {
    const lines = countDiffStats(diffRows);
    const words = countWordDiffStats(diffRows);
    return { ...lines, ...words };
  }, [diffRows]);

  const hasSelectedBody = Boolean(selectedBody);
  const hasPreviousBody = Boolean(previousBody);
  const compareLoading =
    (detailLoading && versionNeedsFullBody(selectedListItem)) ||
    (compareMode === "previous" && previousLoading && versionNeedsFullBody(previousListItem));
  const canCompare = vsCurrent ? hasSelectedBody : hasSelectedBody && hasPreviousBody;
  const leftSublabel = vsCurrent
    ? "Editor · now"
    : selectedListItem
      ? formatNoteVersionTime(selectedListItem.created_at)
      : "—";
  const rightSublabel = vsCurrent
    ? selectedListItem
      ? formatNoteVersionTime(selectedListItem.created_at)
      : "—"
    : previousListItem
      ? formatNoteVersionTime(previousListItem.created_at)
      : "—";

  const actionBusy = restoring || deleting;

  const selectedPartial = isSnapshotPartial(selectedListItem, detail);
  const previousPartial = isSnapshotPartial(previousListItem, previousDetail);
  const partialCompare =
    selectedPartial || (compareMode === "previous" && previousPartial);
  const partialHint = selectedPartial && previousPartial
    ? "Diff may miss content beyond 64 KiB on selected and previous snapshots."
    : selectedPartial
      ? "Diff may miss content beyond 64 KiB on the selected snapshot."
      : "Diff may miss content beyond 64 KiB on the previous snapshot.";

  const pickVersion = (id: string) => {
    onSelect(id);
    const idx = versions.findIndex((v) => v.id === id);
    const hasPrevious = idx >= 0 && idx < versions.length - 1;
    setCompareMode(hasPrevious ? "previous" : "current");
  };

  return (
    <HubToolDetailModal
      open={open}
      onClose={onClose}
      title="Version history"
      titleId="note-history-modal-title"
      headerIcon={GitCompare}
      headerIconClassName="text-violet-300"
      headerTrailing={
        <span className="min-w-0 truncate text-[10px] text-[var(--muted)]">
          {displayTitle}
          {!loading ? (
            <span className="ml-1.5 rounded-full bg-violet-500/10 px-1.5 py-0.5 font-semibold tabular-nums text-violet-200">
              {versions.length}
            </span>
          ) : null}
        </span>
      }
      shellClassName="hub-header-panel-modal note-history-modal-v3"
      bodyClassName="note-history-modal__scroll"
      footer={
        <>
          <HubToolDetailModalPrimaryAction
            label={deleting ? "Deleting…" : "Delete"}
            onClick={onDelete}
            disabled={!selectedId || actionBusy || (loading && versions.length === 0)}
            busy={deleting}
            danger
            icon={Trash2}
          />
          <HubToolDetailModalPrimaryAction
            label={restoring ? "Restoring…" : "Restore"}
            onClick={onRestore}
            disabled={!selectedId || actionBusy || (loading && versions.length === 0)}
            busy={restoring}
            icon={RotateCcw}
          />
        </>
      }
    >
      <div className="note-history-modal__body">
        {loading && versions.length === 0 ? (
          <p className="flex flex-1 items-center justify-center text-[11px] text-[var(--muted)]">Loading snapshots…</p>
        ) : versions.length === 0 ? (
          <p className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-white/10 px-3 py-8 text-center text-[11px] leading-relaxed text-[var(--muted)]">
            No snapshots yet. Save manually, switch notes, or keep editing for {autoIntervalMin}+ minutes.
          </p>
        ) : detailError ? (
          <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-3 text-[11px] text-rose-100">
            {detailError}
          </p>
        ) : (
          <div className="note-history-desktop-grid min-h-0 flex-1">
            <NoteHistorySnapshotRail
              versions={versions}
              selectedId={selectedId}
              autoIntervalMin={autoIntervalMin}
              onPick={pickVersion}
              onPrefetch={prefetchNoteVersion}
            />

            <div className="note-history-compare-center">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CompareModeToggle
                  mode={compareMode}
                  onChange={setCompareMode}
                  previousDisabled={!previousVersionId}
                />
                <DiffLegend />
              </div>

              {canCompare ? (
                <SideBySideDiffPanes
                  leftLabel={vsCurrent ? "Current" : "Selected"}
                  leftSublabel={leftSublabel}
                  rightLabel={vsCurrent ? "Snapshot" : "Previous"}
                  rightSublabel={rightSublabel}
                  rows={diffRows}
                />
              ) : compareLoading ? (
                <div className="note-history-compare-panes note-history-compare-panes--loading">
                  <SideBySideDiffPanes
                    leftLabel={vsCurrent ? "Current" : "Selected"}
                    leftSublabel="Loading…"
                    rightLabel={vsCurrent ? "Snapshot" : "Previous"}
                    rightSublabel="Loading…"
                    rows={[]}
                  />
                </div>
              ) : (
                <p className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-white/10 text-[11px] text-[var(--muted)]">
                  {compareMode === "previous" && !previousVersionId
                    ? "No older snapshot to compare."
                    : "Select a snapshot."}
                </p>
              )}
            </div>

            <NoteHistoryInspectorRail
              source={detail?.source ?? selectedListItem?.source ?? null}
              stats={stats}
              bodyLength={detail?.body_md.length ?? selectedListItem?.body_length ?? 0}
              partialCompare={partialCompare}
              partialHint={partialHint}
            />
          </div>
        )}
      </div>
    </HubToolDetailModal>
  );
}
