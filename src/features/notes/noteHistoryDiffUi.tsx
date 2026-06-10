import type { RefObject, UIEvent } from "react";
import type { InlineWordSegment, SideBySideDiffRow } from "./noteVersionLineDiff";
import { NOTE_VERSION_SOURCE_EMOJI, type NoteVersionSource } from "./noteVersionUtils";

function isWordToken(text: string) {
  return text.trim().length > 0;
}

export function countDiffStats(rows: SideBySideDiffRow[]) {
  let added = 0;
  let removed = 0;
  for (const row of rows) {
    if (row.leftTone === "add") added++;
    if (row.rightTone === "remove") removed++;
  }
  return { added, removed };
}

export function countWordDiffStats(rows: SideBySideDiffRow[]) {
  let wordsAdded = 0;
  let wordsRemoved = 0;
  for (const row of rows) {
    if (row.leftWords?.length) {
      for (const seg of row.leftWords) {
        if (seg.type === "add" && isWordToken(seg.text)) wordsAdded++;
      }
    } else if (row.leftTone === "add" && row.left) {
      wordsAdded += row.left.split(/\s+/).filter(isWordToken).length;
    }
    if (row.rightWords?.length) {
      for (const seg of row.rightWords) {
        if (seg.type === "remove" && isWordToken(seg.text)) wordsRemoved++;
      }
    } else if (row.rightTone === "remove" && row.right) {
      wordsRemoved += row.right.split(/\s+/).filter(isWordToken).length;
    }
  }
  return { wordsAdded, wordsRemoved };
}

/** Design V4 — emoji + label (mobile strip, compact contexts). */
export function SourceEmojiLabel({ source }: { source: NoteVersionSource }) {
  const meta = NOTE_VERSION_SOURCE_EMOJI[source];
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[.03] px-2 py-0.5 text-[10px] font-medium text-[var(--text)]">
      <span aria-hidden>{meta.emoji}</span>
      {meta.label}
    </span>
  );
}

function WordDiffText({ segments, fallback }: { segments?: InlineWordSegment[]; fallback: string | null }) {
  if (!segments?.length) return <>{fallback ?? "\u00a0"}</>;
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === "same") return <span key={i}>{seg.text}</span>;
        const cls = seg.type === "add" ? "note-history-word-add" : "note-history-word-remove";
        return (
          <span key={i} className={cls}>
            {seg.text}
          </span>
        );
      })}
    </>
  );
}

function diffRowTextClass(rowTone: "neutral" | "add" | "remove", hasWords: boolean) {
  if (hasWords) return "text-[var(--text)]/90";
  if (rowTone === "add") return "text-emerald-400";
  if (rowTone === "remove") return "text-rose-400";
  return "text-[var(--text)]/90";
}

export function DiffLegend({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex flex-wrap items-center gap-2 text-[10px] text-[var(--muted)] ${compact ? "gap-1.5" : "gap-3"}`}>
      <span className="inline-flex items-center gap-1">
        <span className="font-semibold text-emerald-400" aria-hidden>
          +
        </span>
        Added
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="font-semibold text-rose-400" aria-hidden>
          −
        </span>
        Removed
      </span>
    </div>
  );
}

export function SideDiffPane({
  label,
  sublabel,
  rows,
  side,
  scrollRef,
  onScroll,
}: {
  label: string;
  sublabel: string;
  tone?: "current" | "past";
  rows: SideBySideDiffRow[];
  side: "left" | "right";
  scrollRef?: RefObject<HTMLDivElement | null>;
  onScroll?: (event: UIEvent<HTMLDivElement>) => void;
}) {
  return (
    <div className="note-history-diff-pane flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0a0c12]/80 shadow-inner">
      <div className="shrink-0 border-b border-white/[.06] px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text)]">{label}</p>
        <p className="truncate text-[10px] text-[var(--muted)]">{sublabel}</p>
      </div>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="note-history-diff-pane__scroll hub-split-scroll hub-split-scroll--panel min-h-0 flex-1 p-1.5 font-mono text-[11px] leading-[1.55]"
      >
        {rows.map((row, i) => {
          const text = side === "left" ? row.left : row.right;
          const words = side === "left" ? row.leftWords : row.rightWords;
          const rowTone = side === "left" ? row.leftTone : row.rightTone;
          const hasWords = Boolean(words?.length);
          return (
            <div
              key={i}
              className={`rounded px-2 py-0.5 whitespace-pre-wrap break-words ${diffRowTextClass(rowTone, hasWords)}`}
            >
              <WordDiffText segments={words} fallback={text} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Desktop dual panes — independent scroll per column. */
export function SideBySideDiffPanes({
  leftLabel,
  leftSublabel,
  rightLabel,
  rightSublabel,
  rows,
}: {
  leftLabel: string;
  leftSublabel: string;
  rightLabel: string;
  rightSublabel: string;
  rows: SideBySideDiffRow[];
}) {
  return (
    <div className="note-history-compare-panes">
      <SideDiffPane label={leftLabel} sublabel={leftSublabel} rows={rows} side="left" />
      <SideDiffPane label={rightLabel} sublabel={rightSublabel} rows={rows} side="right" />
    </div>
  );
}

/** Mobile — unified +/− diff stream (Design V2). */
export function UnifiedDiffStream({ rows }: { rows: SideBySideDiffRow[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0a0c12]/80 font-mono text-[11px] leading-[1.6] shadow-inner">
      {rows.map((row, i) => {
        const pairedChange = row.leftTone === "add" && row.rightTone === "remove";
        if (pairedChange) {
          return (
            <div key={i}>
              <div className={`px-3 py-0.5 ${diffRowTextClass("remove", Boolean(row.rightWords?.length))}`}>
                <span className="mr-2 select-none text-rose-400/80">−</span>
                <WordDiffText segments={row.rightWords} fallback={row.right} />
              </div>
              <div className={`px-3 py-0.5 ${diffRowTextClass("add", Boolean(row.leftWords?.length))}`}>
                <span className="mr-2 select-none text-emerald-400/80">+</span>
                <WordDiffText segments={row.leftWords} fallback={row.left} />
              </div>
            </div>
          );
        }
        if (row.leftTone === "add") {
          return (
            <div key={i} className={`px-3 py-0.5 ${diffRowTextClass("add", Boolean(row.leftWords?.length))}`}>
              <span className="mr-2 select-none text-emerald-400/80">+</span>
              <WordDiffText segments={row.leftWords} fallback={row.left} />
            </div>
          );
        }
        if (row.rightTone === "remove") {
          return (
            <div key={i} className={`px-3 py-0.5 ${diffRowTextClass("remove", Boolean(row.rightWords?.length))}`}>
              <span className="mr-2 select-none text-rose-400/80">−</span>
              <WordDiffText segments={row.rightWords} fallback={row.right} />
            </div>
          );
        }
        return (
          <div key={i} className="px-3 py-0.5 text-[var(--text)]/55">
            <span className="mr-2 select-none opacity-40">&nbsp;</span>
            {row.left}
          </div>
        );
      })}
    </div>
  );
}

export type NoteHistoryCompareMode = "current" | "previous";

export function CompareModeToggle({
  mode,
  onChange,
  previousDisabled,
}: {
  mode: NoteHistoryCompareMode;
  onChange: (mode: NoteHistoryCompareMode) => void;
  previousDisabled?: boolean;
}) {
  const vsCurrent = mode === "current";
  return (
    <div className="inline-flex rounded-lg border border-white/10 bg-white/[.02] p-0.5">
      <button
        type="button"
        className={`rounded-md px-2.5 py-1 text-[10px] font-semibold transition-colors ${
          vsCurrent ? "bg-violet-500/20 text-violet-100 ring-1 ring-violet-500/35" : "text-[var(--muted)] hover:text-[var(--text)]"
        }`}
        onClick={() => onChange("current")}
      >
        vs Current
      </button>
      <button
        type="button"
        disabled={previousDisabled}
        className={`rounded-md px-2.5 py-1 text-[10px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          !vsCurrent ? "bg-violet-500/20 text-violet-100 ring-1 ring-violet-500/35" : "text-[var(--muted)] hover:text-[var(--text)]"
        }`}
        onClick={() => onChange("previous")}
      >
        vs Previous
      </button>
    </div>
  );
}
