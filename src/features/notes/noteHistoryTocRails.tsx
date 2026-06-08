import {
  formatNoteVersionTime,
  noteVersionSourceEmoji,
  noteVersionSourceTooltip,
  type NoteVersionListItem,
  type NoteVersionSource,
} from "./noteVersionUtils";
import type { NotesVersionIntervalMinutes } from "./notes-version-prefs";

type SnapshotRailProps = {
  versions: NoteVersionListItem[];
  selectedId: string | null;
  autoIntervalMin?: NotesVersionIntervalMinutes;
  onPick: (id: string) => void;
  onPrefetch: (id: string) => void;
};

/** Left rail — Design V4: wide hub-toc-nav · emoji labels (Settings-style). */
export function NoteHistorySnapshotRail({
  versions,
  selectedId,
  autoIntervalMin,
  onPick,
  onPrefetch,
}: SnapshotRailProps) {
  return (
    <nav className="hub-toc-nav note-history-snapshot-toc" aria-label="Snapshots">
      <p className="note-history-toc-rail__title note-history-toc-rail__title--emoji">📋 Snapshots</p>
      <ul className="hub-toc-nav__list space-y-0.5">
        {versions.map((v) => {
          const active = v.id === selectedId;
          const sourceEmoji = noteVersionSourceEmoji(v.source).emoji;
          return (
            <li key={v.id}>
              <button
                type="button"
                title={noteVersionSourceTooltip(v.source, autoIntervalMin)}
                className={`hub-toc-nav__item group relative z-[1] min-h-[var(--overview-toc-row-h,2.125rem)] w-full cursor-pointer text-left text-[13px] transition-colors${
                  active ? " is-active" : ""
                }`}
                onClick={() => onPick(v.id)}
                onMouseEnter={() => onPrefetch(v.id)}
                onFocus={() => onPrefetch(v.id)}
              >
                <span className="hub-toc-nav__label flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-medium text-[var(--muted)] transition-all duration-200 group-hover:text-[var(--text)]">
                  <span className="shrink-0 text-[12px] leading-none opacity-90" aria-hidden>
                    {sourceEmoji}
                  </span>
                  <span className="min-w-0 truncate">
                    {formatNoteVersionTime(v.created_at)} · {v.label ?? v.title}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function InspectorEmojiRow({
  emoji,
  label,
  value,
  valueClass,
}: {
  emoji: string;
  label: string;
  value: string | number;
  valueClass?: string;
}) {
  return (
    <li>
      <div className="hub-toc-nav__item group min-h-[var(--overview-toc-row-h,2.125rem)] w-full text-left text-[13px]">
        <span className="hub-toc-nav__label flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1 font-medium text-[var(--muted)]">
          <span className="shrink-0 text-[12px] leading-none opacity-90" aria-hidden>
            {emoji}
          </span>
          <span className="min-w-0 flex-1 truncate text-[11px]">{label}</span>
          <span className={`shrink-0 tabular-nums text-[11px] font-semibold ${valueClass ?? "text-[var(--text)]"}`}>
            {value}
          </span>
        </span>
      </div>
    </li>
  );
}

type InspectorRailProps = {
  source: NoteVersionSource | null;
  stats: { added: number; removed: number; wordsAdded: number; wordsRemoved: number };
  bodyLength: number;
  partialCompare?: boolean;
  partialHint?: string;
};

/** Right rail — Design V4: wide hub-toc-nav · emoji inspector rows. */
export function NoteHistoryInspectorRail({
  source,
  stats,
  bodyLength,
  partialCompare,
  partialHint,
}: InspectorRailProps) {
  return (
    <nav className="hub-toc-nav note-history-inspector-toc" aria-label="Inspector">
      <p className="note-history-toc-rail__title note-history-toc-rail__title--emoji">🔍 Inspector</p>
      <ul className="hub-toc-nav__list space-y-0.5">
        {source ? (
          <InspectorEmojiRow
            emoji={noteVersionSourceEmoji(source).emoji}
            label="Source"
            value={noteVersionSourceEmoji(source).label}
          />
        ) : null}
        <InspectorEmojiRow emoji="➕" label="Lines added" value={stats.added} valueClass="text-emerald-300" />
        <InspectorEmojiRow emoji="➖" label="Lines removed" value={stats.removed} valueClass="text-rose-300" />
        <InspectorEmojiRow emoji="🟢" label="Words added" value={stats.wordsAdded} valueClass="text-emerald-300" />
        <InspectorEmojiRow emoji="🔴" label="Words removed" value={stats.wordsRemoved} valueClass="text-rose-300" />
        <InspectorEmojiRow emoji="📄" label="Snapshot size" value={`${bodyLength} chars`} />
        {partialCompare ? (
          <li title={partialHint}>
            <div className="hub-toc-nav__item group min-h-[var(--overview-toc-row-h,2.125rem)] w-full text-left text-[13px]">
              <span className="hub-toc-nav__label flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1 font-medium text-[var(--muted)]">
                <span className="shrink-0 text-[12px] leading-none opacity-90" aria-hidden>
                  ⚠️
                </span>
                <span className="min-w-0 flex-1 truncate text-[11px]">Compare</span>
                <span className="shrink-0 rounded-full border border-amber-400/35 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-200">
                  Partial
                </span>
              </span>
            </div>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
