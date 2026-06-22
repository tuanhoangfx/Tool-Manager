import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Cookie, Pin } from "lucide-react";
import { HubActivityTimestampLabel } from "@tool-workspace/hub-ui";
import { resolveCookieSiteIcon } from "../cookie/cookieSiteIcon";
import type { NotesCookieRouteIndex } from "../cookie/useNotesCookieRouteIndex";
import { NotesFolderGlyph } from "./NotesFolderGlyph";
import { getPrimaryFolderForListNote } from "./noteFolders";
import type { NoteFolder } from "./noteFolders";
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
  onPinToggle: (id: string) => void;
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
  onPinToggle,
}: Props) {
  const compact = density === "compact";
  const rowHeight = NOTES_LIST_ROW_HEIGHT[compact ? "compact" : "comfortable"];
  const { scrollRef, enabled, visible, totalHeight, offsetY, scrollNoteIntoView } =
    useNotesListVirtualWindow(notes, rowHeight);

  /** Scroll selected row into view once per selection — not on list refresh/autosave. */
  const scrollAnchorRef = useRef<{ selectedId: string | null; done: boolean }>({
    selectedId: null,
    done: false,
  });

  useLayoutEffect(() => {
    if (!selectedId) {
      scrollAnchorRef.current = { selectedId: null, done: false };
      return;
    }

    if (scrollAnchorRef.current.selectedId !== selectedId) {
      scrollAnchorRef.current = { selectedId, done: false };
    }

    if (scrollAnchorRef.current.done) return;

    const index = notes.findIndex((n) => n.id === selectedId);
    if (index < 0) return;

    scrollNoteIntoView(selectedId, index, "auto");
    scrollAnchorRef.current.done = true;
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
                  onPinToggle={onPinToggle}
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
                onPinToggle={onPinToggle}
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
  onPinToggle,
}: {
  note: NoteListItem;
  active: boolean;
  compact: boolean;
  cookieRouteByNoteId?: NotesCookieRouteIndex;
  cookieRouteNoteIds: ReadonlySet<string>;
  displayFolders: NoteFolder[];
  noteFolders: Record<string, string[]>;
  onSelect: (id: string) => void;
  onPinToggle: (id: string) => void;
}) {
  const [pinPulse, setPinPulse] = useState(false);
  const routeDomain = cookieRouteByNoteId?.get(n.id) ?? null;
  const primaryFolder = getPrimaryFolderForListNote(
    n.id,
    n.created_at,
    noteFolders,
    cookieRouteNoteIds,
    displayFolders,
  );
  const isCookieRoute = cookieRouteNoteIds.has(n.id);
  const pinDisabled = isCookieRoute;
  const activityAt = isCookieRoute ? n.synced_at : n.updated_at;
  const showActivity = Boolean(activityAt?.trim()) || isCookieRoute;

  return (
    <li>
      <button
        type="button"
        data-note-id={n.id}
        onMouseEnter={() => prefetchNoteDetail(n.id)}
        onFocus={() => prefetchNoteDetail(n.id)}
        onClick={() => onSelect(n.id)}
        className={`notes-rail__row relative w-full rounded-lg border text-left transition-all ${
          compact ? "px-1.5 py-1 pr-7" : "px-2 py-1.5 pr-8"
        } ${
          active
            ? "border-indigo-400/45 bg-indigo-500/15 ring-1 ring-indigo-400/25"
            : "border-transparent bg-white/[.02] hover:border-white/10 hover:bg-white/[.05]"
        } ${n.pinned ? "notes-rail__row--pinned" : ""}`}
      >
        <span className="notes-rail__body block min-w-0">
          <span
            className={`hub-directory-rail-title notes-rail__title flex min-w-0 items-center gap-1 font-medium text-[var(--text)] ${
              compact ? "hub-directory-rail-title--compact" : ""
            }`}
          >
            <span className="notes-rail__title-leading inline-flex w-4 shrink-0 items-center justify-center">
              {routeDomain ? (
                <CookieRouteMark domain={routeDomain} compact={compact} />
              ) : primaryFolder ? (
                <span title={primaryFolder.name}>
                  <NotesFolderGlyph
                    variant="icon"
                    color={primaryFolder.color}
                    size={compact ? 11 : 12}
                  />
                </span>
              ) : null}
            </span>
            <span className="min-w-0 flex-1 truncate">{displayNoteTitle(n.title)}</span>
          </span>
          {showActivity ? (
            <span
              className={`hub-directory-rail-meta notes-rail__time mt-0.5 flex min-w-0 items-center gap-1 truncate ${
                compact ? "hub-directory-rail-meta--compact" : ""
              }`}
            >
              <span className="min-w-0 flex-1 truncate">
                <HubActivityTimestampLabel
                  at={activityAt}
                  fallback={isCookieRoute ? "Not synced yet" : "—"}
                />
              </span>
            </span>
          ) : null}
        </span>
        <NoteRowPinButton
          pinned={n.pinned}
          disabled={pinDisabled}
          pulse={pinPulse}
          compact={compact}
          onToggle={() => {
            setPinPulse(true);
            onPinToggle(n.id);
            window.setTimeout(() => setPinPulse(false), 320);
          }}
        />
      </button>
    </li>
  );
}

function NoteRowPinButton({
  pinned,
  disabled,
  pulse,
  compact,
  onToggle,
}: {
  pinned: boolean;
  disabled: boolean;
  pulse: boolean;
  compact: boolean;
  onToggle: () => void;
}) {
  const size = compact ? 11 : 12;

  return (
    <span
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={disabled ? "Pin disabled for Cookie Bridge routes" : pinned ? "Unpin note" : "Pin note"}
      aria-pressed={pinned}
      title={
        disabled
          ? "Pin is disabled while a Cookie Bridge route is active"
          : pinned
            ? "Unpin note"
            : "Pin note"
      }
      className={`notes-rail__pin absolute right-1 top-1 z-[1] inline-flex items-center justify-center rounded-md p-0.5 transition-colors ${
        disabled ? "cursor-not-allowed opacity-35" : "cursor-pointer hover:bg-violet-500/15"
      } ${pinned ? "notes-rail__pin--on" : ""} ${pulse ? "anim-pop" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        if (disabled) return;
        onToggle();
      }}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }
      }}
    >
      <Pin
        size={size}
        className={pinned ? "fill-violet-300/90 text-violet-300" : "text-white/30"}
        aria-hidden
      />
    </span>
  );
}

function CookieRouteMark({ domain, compact }: { domain: string; compact: boolean }) {
  const site = resolveCookieSiteIcon(domain);
  const [imgFailed, setImgFailed] = useState(false);
  const title = `Cookie Bridge route · ${domain}`;
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
