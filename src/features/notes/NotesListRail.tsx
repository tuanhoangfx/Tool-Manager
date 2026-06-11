import { useEffect, useState, useLayoutEffect } from "react";
import { Cookie, Pin } from "lucide-react";
import { resolveCookieSiteIcon } from "../cookie/cookieSiteIcon";
import type { NotesCookieRouteIndex } from "../cookie/useNotesCookieRouteIndex";
import { NotesFolderListDot } from "./NotesFolderGlyph";
import { getPrimaryFolderForListNote } from "./noteFolders";
import type { NoteFolder } from "./noteFolders";
import { noteEditorTocLabel } from "./noteUtils";
import type { NoteListItem } from "./types";
import type { NotesListDensity } from "./notes-list-prefs";
import { prefetchNoteDetail, prefetchNoteDetailBatch } from "./noteDetailPrefetch";
import { NOTES_LIST_ROW_HEIGHT, useNotesListVirtualWindow } from "./useNotesListVirtualWindow";

type Props = {
  notes: NoteListItem[];
  selectedId: string | null;
  density: NotesListDensity;
  loading?: boolean;
  refreshing?: boolean;
  cookieRouteByNoteId?: NotesCookieRouteIndex;
  cookieRouteNoteIds: ReadonlySet<string>;
  displayFolders: NoteFolder[];
  noteFolders: Record<string, string[]>;
  onSelect: (id: string) => void;
};

/** Left TOC rail — title, relative edit/sync time, folder dot, cookie route icon. */
export function NotesListRail({
  notes,
  selectedId,
  density,
  loading,
  refreshing,
  cookieRouteByNoteId,
  cookieRouteNoteIds,
  displayFolders,
  noteFolders,
  onSelect,
}: Props) {
  const compact = density === "compact";
  const rowHeight = NOTES_LIST_ROW_HEIGHT[compact ? "compact" : "comfortable"];
  const { scrollRef, enabled, visible, totalHeight, offsetY, scrollNoteIntoView } =
    useNotesListVirtualWindow(notes, rowHeight);

  useLayoutEffect(() => {
    if (!selectedId) return;
    const index = notes.findIndex((n) => n.id === selectedId);
    if (index < 0) return;
    scrollNoteIntoView(selectedId, index);
  }, [notes, scrollNoteIntoView, selectedId]);

  useEffect(() => {
    if (notes.length === 0) return;
    const viewportIds = enabled
      ? visible.map(({ item }) => item.id)
      : notes.slice(0, 12).map((n) => n.id);
    const timer = window.setTimeout(() => {
      prefetchNoteDetailBatch(viewportIds, 12);
    }, 100);
    return () => window.clearTimeout(timer);
  }, [enabled, notes, visible]);

  return (
    <aside className="notes-rail flex min-h-0 shrink-0 flex-col self-stretch overflow-hidden rounded-xl border border-white/10 bg-[var(--panel)]/40">
      <div
        ref={scrollRef}
        className="notes-rail__scroll hub-split-scroll hub-split-scroll--rail relative p-1.5"
      >
        {loading && notes.length === 0 ? (
          <p className="px-2 py-2 text-[11px] text-[var(--muted)]">Loading…</p>
        ) : null}
        {!loading && notes.length === 0 ? (
          <p className="px-2 py-2 text-[11px] text-[var(--muted)]">No notes match filters.</p>
        ) : null}
        {enabled && totalHeight != null ? (
          <div className="relative w-full" style={{ height: totalHeight }}>
            <ul
              className="absolute left-0 right-0 top-0 space-y-0.5"
              style={{ transform: `translateY(${offsetY}px)` }}
            >
              {visible.map(({ item: n }) => (
                <NoteListRow
                  key={n.id}
                  note={n}
                  active={n.id === selectedId}
                  compact={compact}
                  cookieRouteByNoteId={cookieRouteByNoteId}
                  cookieRouteNoteIds={cookieRouteNoteIds}
                  displayFolders={displayFolders}
                  noteFolders={noteFolders}
                  onSelect={onSelect}
                />
              ))}
            </ul>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {notes.map((n) => (
              <NoteListRow
                key={n.id}
                note={n}
                active={n.id === selectedId}
                compact={compact}
                cookieRouteByNoteId={cookieRouteByNoteId}
                cookieRouteNoteIds={cookieRouteNoteIds}
                displayFolders={displayFolders}
                noteFolders={noteFolders}
                onSelect={onSelect}
              />
            ))}
          </ul>
        )}
        {refreshing ? (
          <p className="pointer-events-none absolute bottom-1 left-0 right-0 z-[1] px-2 py-0.5 text-[10px] text-[var(--muted)]">
            Refreshing…
          </p>
        ) : null}
      </div>
    </aside>
  );
}

function NoteListRow({
  note: n,
  active,
  compact,
  cookieRouteByNoteId,
  cookieRouteNoteIds,
  displayFolders,
  noteFolders,
  onSelect,
}: {
  note: NoteListItem;
  active: boolean;
  compact: boolean;
  cookieRouteByNoteId?: NotesCookieRouteIndex;
  cookieRouteNoteIds: ReadonlySet<string>;
  displayFolders: NoteFolder[];
  noteFolders: Record<string, string[]>;
  onSelect: (id: string) => void;
}) {
  const routeDomain = cookieRouteByNoteId?.get(n.id) ?? null;
  const primaryFolder = getPrimaryFolderForListNote(
    n.id,
    n.created_at,
    noteFolders,
    cookieRouteNoteIds,
    displayFolders,
  );
  const isCookieRoute = cookieRouteNoteIds.has(n.id);
  const timeLabel = noteEditorTocLabel(n, isCookieRoute);

  return (
    <li>
      <button
        type="button"
        data-note-id={n.id}
        onMouseEnter={() => prefetchNoteDetail(n.id)}
        onFocus={() => prefetchNoteDetail(n.id)}
        onClick={() => onSelect(n.id)}
        className={`flex w-full items-start gap-1.5 rounded-lg border text-left transition-all ${
          compact ? "px-1.5 py-1" : "px-2 py-1.5"
        } ${
          active
            ? "border-indigo-400/45 bg-indigo-500/15 ring-1 ring-indigo-400/25"
            : "border-transparent bg-white/[.02] hover:border-white/10 hover:bg-white/[.05]"
        }`}
      >
        {primaryFolder ? (
          <NotesFolderListDot color={primaryFolder.color} title={primaryFolder.name} />
        ) : (
          <span
            className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
              n.syncTone === "emerald"
                ? "bg-emerald-400"
                : n.syncTone === "rose"
                  ? "bg-rose-400"
                  : "bg-amber-400"
            }`}
            title={n.syncLabel}
            aria-hidden
          />
        )}
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate font-medium text-[var(--text)] ${
              compact ? "text-[11px]" : "text-[12px]"
            }`}
          >
            {displayNoteTitle(n.title)}
          </span>
          {timeLabel ? (
            <span
              className={`notes-rail__time mt-0.5 block truncate font-medium text-violet-300/75 ${
                compact ? "text-[9px]" : "text-[10px]"
              }`}
              title={isCookieRoute ? n.synced_at ?? undefined : n.updated_at}
            >
              {timeLabel}
            </span>
          ) : null}
        </span>
        <span className="flex shrink-0 items-center gap-1 pt-0.5">
          {routeDomain ? <CookieRouteMark domain={routeDomain} compact={compact} /> : null}
          {n.pinned ? <Pin size={11} className="text-violet-300" aria-label="Pinned" /> : null}
        </span>
      </button>
    </li>
  );
}

function CookieRouteMark({ domain, compact }: { domain: string; compact: boolean }) {
  const site = resolveCookieSiteIcon(domain);
  const [imgFailed, setImgFailed] = useState(false);
  const title = `Cookie Auto route · ${domain}`;
  const box = compact ? "h-3.5 w-3.5" : "h-4 w-4";

  if (site && !imgFailed) {
    return (
      <span className="inline-flex shrink-0 items-center" title={title} aria-label={title}>
        <img
          src={site.src}
          alt=""
          className={`${box} rounded object-contain`}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
        />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded border border-cyan-400/30 bg-cyan-500/12 text-cyan-200 ${box}`}
      title={title}
      aria-label={title}
    >
      <Cookie size={compact ? 10 : 11} />
    </span>
  );
}

function displayNoteTitle(title: string): string {
  return title.trim() === "Note mới" ? "New note" : title || "Untitled";
}
