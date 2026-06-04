import { useEffect, useRef } from "react";
import type { NoteRouteLockInfo } from "../cookie/noteRouteLockInfo";
import { NoteCookieSnapshotBlock } from "./NoteCookieSnapshotBlock";
import { NoteEditorMetaStrip } from "./NoteEditorMetaStrip";
import { NoteEditorRouteOpenButtons } from "./NoteEditorRouteTitleActions";
import { NotesNoteFolderFilter } from "./NotesNoteFolderFilter";
import type { NoteFolder } from "./noteFolders";
import { cookieLines } from "./noteUtils";
import type { NoteRow } from "./types";

type Props = {
  note: NoteRow | null;
  loading?: boolean;
  title: string;
  body: string;
  routeLocked?: boolean;
  routeInfos?: NoteRouteLockInfo[];
  folders: NoteFolder[];
  effectiveFolderIds: string[];
  userFolderIds: string[];
  onUserFoldersChange: (folderIds: string[]) => void;
  onOpenRouteDetail?: (domain: string) => void;
  onTitleChange: (v: string) => void;
  onBodyChange: (v: string) => void;
  onSlugFromTitle: () => void;
};

function syncTextareaHeight(el: HTMLTextAreaElement | null) {
  if (!el) return;
  const body = el.closest(".notes-editor__body");
  const panel = body?.querySelector(".fm-cookie-panel");
  const panelH = panel?.getBoundingClientRect().height ?? 0;
  const gap = panel ? 12 : 0;
  const fillMin = Math.max((body?.clientHeight ?? 0) - panelH - gap, 224);
  el.style.height = "auto";
  el.style.minHeight = `${fillMin}px`;
  el.style.height = `${Math.max(el.scrollHeight, fillMin)}px`;
}

function isEditorChromeTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      ".fm-cookie-panel, button, a, input, select, textarea, [role='listbox'], [role='dialog']",
    ),
  );
}

export function NoteEditorPanel({
  note,
  loading,
  title,
  body,
  routeLocked = false,
  routeInfos = [],
  folders,
  effectiveFolderIds,
  userFolderIds,
  onUserFoldersChange,
  onOpenRouteDetail,
  onTitleChange,
  onBodyChange,
  onSlugFromTitle,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const cookieSnapshotLines = note ? cookieLines(note.cookie_snapshot) : [];
  const lockedBody = cookieSnapshotLines.join("\n");
  const editorValue = routeLocked ? lockedBody : body;
  const showCookieSnapshot = Boolean(
    note &&
      !routeLocked &&
      (cookieSnapshotLines.length > 0 || note.sync_status === "synced"),
  );

  useEffect(() => {
    syncTextareaHeight(textareaRef.current);
  }, [editorValue, routeLocked, showCookieSnapshot]);

  useEffect(() => {
    const body = textareaRef.current?.closest(".notes-editor__body");
    if (!body || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => syncTextareaHeight(textareaRef.current));
    ro.observe(body);
    return () => ro.disconnect();
  }, [showCookieSnapshot]);

  const focusEditor = () => textareaRef.current?.focus();

  return (
    <section className="notes-editor flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/10">
      <div className="notes-editor__header flex min-h-[2.375rem] shrink-0 items-center gap-2 border-b border-white/5 px-3 py-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
          {routeLocked && routeInfos.length > 0 && onOpenRouteDetail ? (
            <NoteEditorRouteOpenButtons
              noteId={note?.id}
              routes={routeInfos}
              onOpenRoute={onOpenRouteDetail}
            />
          ) : null}
          <input
            className="notes-editor__title min-w-[4ch] flex-1 border-0 bg-transparent p-0 text-sm font-semibold text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
            value={title}
            placeholder="Untitled"
            aria-label="Note title"
            onChange={(e) => onTitleChange(e.target.value)}
            onBlur={() => onSlugFromTitle()}
          />
        </div>
        {note?.id ? (
          <NotesNoteFolderFilter
            folders={folders}
            effectiveFolderIds={effectiveFolderIds}
            userFolderIds={userFolderIds}
            onUserFoldersChange={onUserFoldersChange}
          />
        ) : null}
        <NoteEditorMetaStrip note={note} loading={loading} hideDomain={routeLocked} routeLocked={routeLocked} />
      </div>

      <div
        className="notes-editor__body min-h-0 flex-1 cursor-text overflow-y-auto"
        onMouseDown={(e) => {
          if (isEditorChromeTarget(e.target)) return;
          focusEditor();
        }}
      >
        {showCookieSnapshot ? (
          <NoteCookieSnapshotBlock
            lines={cookieSnapshotLines}
            syncStatus={note?.sync_status ?? "pending"}
            syncedAt={note?.synced_at ?? null}
            bodyMd={body}
            onInsertIntoMarkdown={onBodyChange}
          />
        ) : null}
        <textarea
          ref={textareaRef}
          readOnly={routeLocked}
          className={`notes-editor__textarea w-full resize-none font-sans text-[13px] leading-relaxed outline-none${
            routeLocked ? " notes-editor__textarea--locked" : ""
          }`}
          placeholder={routeLocked ? "Cookie snapshot will appear after sync…" : "Write markdown…"}
          value={editorValue}
          onChange={
            routeLocked
              ? undefined
              : (e) => {
                  onBodyChange(e.target.value);
                  syncTextareaHeight(e.target);
                }
          }
          onBlur={
            routeLocked
              ? undefined
              : () => {
                  if (!title.trim()) onSlugFromTitle();
                }
          }
        />
      </div>
    </section>
  );
}
