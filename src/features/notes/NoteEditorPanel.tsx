import type { NoteRouteLockInfo } from "../cookie/noteRouteLockInfo";
import { NoteCookieSnapshotBlock } from "./NoteCookieSnapshotBlock";
import { NoteEditorMetaStrip } from "./NoteEditorMetaStrip";
import { NoteEditorRouteOpenButtons } from "./NoteEditorRouteTitleActions";
import { cookieLines } from "./noteUtils";
import type { NoteRow } from "./types";

type Props = {
  note: NoteRow | null;
  loading?: boolean;
  title: string;
  body: string;
  actionError?: string;
  routeLocked?: boolean;
  routeInfos?: NoteRouteLockInfo[];
  onOpenRouteDetail?: (domain: string) => void;
  onTitleChange: (v: string) => void;
  onBodyChange: (v: string) => void;
  onSlugFromTitle: () => void;
};

export function NoteEditorPanel({
  note,
  loading,
  title,
  body,
  actionError,
  routeLocked = false,
  routeInfos = [],
  onOpenRouteDetail,
  onTitleChange,
  onBodyChange,
  onSlugFromTitle,
}: Props) {
  const cookieSnapshotLines = note ? cookieLines(note.cookie_snapshot) : [];
  const showCookieSnapshot = Boolean(
    note &&
      (routeLocked || cookieSnapshotLines.length > 0 || note.sync_status === "synced"),
  );

  return (
    <section className="notes-editor flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/10">
      <div className="notes-editor__header flex min-h-[2.375rem] shrink-0 items-center gap-2 border-b border-white/5 px-2.5 py-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
          {routeLocked && routeInfos.length > 0 && onOpenRouteDetail ? (
            <NoteEditorRouteOpenButtons routes={routeInfos} onOpenRoute={onOpenRouteDetail} />
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
        <NoteEditorMetaStrip note={note} loading={loading} hideDomain={routeLocked} routeLocked={routeLocked} />
      </div>

      {actionError ? (
        <p className="shrink-0 border-b border-rose-500/20 bg-rose-500/10 px-2.5 py-1.5 text-[11px] text-rose-200">
          {actionError}
        </p>
      ) : null}

      <div className="notes-editor__body min-h-0 flex-1 overflow-y-auto px-2.5 py-2">
        {showCookieSnapshot ? (
          <div className="mb-3">
            <NoteCookieSnapshotBlock
              lines={cookieSnapshotLines}
              syncStatus={note?.sync_status ?? "pending"}
              syncedAt={note?.synced_at ?? null}
              bodyMd={body}
              routeLocked={routeLocked}
              onInsertIntoMarkdown={onBodyChange}
            />
          </div>
        ) : null}
        {!routeLocked ? (
          <textarea
            className="notes-editor__textarea min-h-[14rem] w-full resize-none rounded-lg px-1 py-2 font-sans text-[13px] leading-relaxed outline-none"
            placeholder="Write markdown…"
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            onBlur={() => {
              if (!title.trim()) onSlugFromTitle();
            }}
          />
        ) : null}
      </div>
    </section>
  );
}
