import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { getDirectorySearchHighlight, HubSearchField } from "@tool-workspace/hub-ui";
import { TWOFA_ADM_CONTROL_CLASS } from "./TwofaDetailField";

type Props = {
  value: string;
  onChange: (value: string) => void;
  name?: string;
  placeholder?: string;
};

type MatchRange = { start: number; end: number };

type MirrorSegment = { text: string; kind: "plain" | "match" | "active" };

function findTextMatchRanges(text: string, terms: string[]): MatchRange[] {
  if (!text || terms.length === 0) return [];

  const lower = text.toLowerCase();
  const ranges: MatchRange[] = [];

  for (const term of terms) {
    const needle = term.trim();
    if (!needle) continue;
    const tLower = needle.toLowerCase();
    let from = 0;
    while (from < lower.length) {
      const idx = lower.indexOf(tLower, from);
      if (idx === -1) break;
      ranges.push({ start: idx, end: idx + tLower.length });
      from = idx + 1;
    }
  }

  ranges.sort((a, b) => a.start - b.start);
  return ranges;
}

function buildMirrorSegments(text: string, ranges: MatchRange[], activeIndex: number): MirrorSegment[] {
  if (!text) return [];
  if (!ranges.length) return [{ text, kind: "plain" }];

  const segments: MirrorSegment[] = [];
  let pos = 0;

  for (let i = 0; i < ranges.length; i++) {
    const range = ranges[i]!;
    if (pos < range.start) {
      segments.push({ text: text.slice(pos, range.start), kind: "plain" });
    }
    segments.push({
      text: text.slice(range.start, range.end),
      kind: activeIndex >= 0 && activeIndex === i ? "active" : "match",
    });
    pos = range.end;
  }

  if (pos < text.length) {
    segments.push({ text: text.slice(pos), kind: "plain" });
  }

  return segments;
}

function TwofaNoteSearchMirror({
  text,
  ranges,
  activeIndex,
}: {
  text: string;
  ranges: MatchRange[];
  activeIndex: number;
}) {
  const segments = useMemo(
    () => buildMirrorSegments(text, ranges, activeIndex),
    [activeIndex, ranges, text],
  );

  return (
    <span className="twofa-adm-note-editor__mirror">
      {segments.map((segment, index) => {
        if (segment.kind === "plain") {
          return <span key={index}>{segment.text}</span>;
        }
        return (
          <mark
            key={index}
            className={
              segment.kind === "active"
                ? "twofa-adm-note-editor__mark twofa-adm-note-editor__mark--active"
                : "twofa-adm-note-editor__mark"
            }
          >
            {segment.text}
          </mark>
        );
      })}
    </span>
  );
}

export function TwofaNoteSearchField({
  value,
  onChange,
  name = "twofa-detail-note",
  placeholder = "Optional notes, mail recovery, plan info…",
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMatch, setActiveMatch] = useState(0);
  const [matchRevealed, setMatchRevealed] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const highlightTerms = useMemo(() => {
    const highlight = getDirectorySearchHighlight(searchQuery, { mixedRequiresWhitespace: false });
    return highlight?.textTerms ?? [];
  }, [searchQuery]);

  const matchRanges = useMemo(
    () => findTextMatchRanges(value, highlightTerms),
    [highlightTerms, value],
  );

  const hasSearch = highlightTerms.length > 0;
  const mirrorActiveIndex = matchRevealed ? activeMatch : -1;
  const matchLabel =
    matchRanges.length > 0
      ? matchRevealed
        ? `${activeMatch + 1}/${matchRanges.length}`
        : `0/${matchRanges.length}`
      : hasSearch
        ? "0/0"
        : "";

  const syncBackdropScroll = useCallback(() => {
    const textarea = textareaRef.current;
    const backdrop = backdropRef.current;
    if (!textarea || !backdrop) return;
    backdrop.scrollTop = textarea.scrollTop;
    backdrop.scrollLeft = textarea.scrollLeft;
  }, []);

  const refocusSearch = useCallback(() => {
    requestAnimationFrame(() => searchRef.current?.focus());
  }, []);

  const revealMatch = useCallback(
    (index: number) => {
      if (!matchRanges.length) return;
      const textarea = textareaRef.current;
      if (!textarea) return;

      const normalized = ((index % matchRanges.length) + matchRanges.length) % matchRanges.length;
      const { start } = matchRanges[normalized]!;

      const lineHeight = Number.parseFloat(getComputedStyle(textarea).lineHeight) || 16;
      const linesBefore = value.slice(0, start).split("\n").length - 1;
      const targetTop = Math.max(0, linesBefore * lineHeight - textarea.clientHeight / 3);
      textarea.scrollTop = targetTop;
      syncBackdropScroll();
      setActiveMatch(normalized);
      setMatchRevealed(true);
    },
    [matchRanges, syncBackdropScroll, value],
  );

  useEffect(() => {
    setActiveMatch(0);
    setMatchRevealed(false);
  }, [searchQuery]);

  const stepMatch = useCallback(
    (delta: number) => {
      if (!matchRanges.length) return;
      revealMatch(activeMatch + delta);
      refocusSearch();
    },
    [activeMatch, matchRanges.length, refocusSearch, revealMatch],
  );

  const handleSearchEnter = useCallback(
    (shift: boolean) => {
      if (!matchRanges.length) return;
      if (!matchRevealed) {
        revealMatch(0);
        refocusSearch();
        return;
      }
      stepMatch(shift ? -1 : 1);
    },
    [matchRanges.length, matchRevealed, refocusSearch, revealMatch, stepMatch],
  );

  useEffect(() => {
    const el = searchRef.current;
    if (!el) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      handleSearchEnter(e.shiftKey);
    };
    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
  }, [handleSearchEnter]);

  return (
    <>
      <div className="twofa-adm-note-search" role="search">
        <HubSearchField
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search note…"
          showShortcutHint={false}
          inputRef={searchRef}
          className="twofa-adm-note-search__field"
        />
        {hasSearch ? (
          <div className="twofa-adm-note-search__nav">
            <span className="twofa-adm-note-search__count" aria-live="polite">
              {matchLabel}
            </span>
            <button
              type="button"
              className="twofa-adm-note-search__btn"
              aria-label="Previous match"
              title="Previous match (Shift+Enter)"
              disabled={!matchRanges.length || !matchRevealed}
              onClick={() => stepMatch(-1)}
            >
              <ChevronUp size={12} aria-hidden />
            </button>
            <button
              type="button"
              className="twofa-adm-note-search__btn"
              aria-label="Next match"
              title="Next match (Enter)"
              disabled={!matchRanges.length}
              onClick={() => {
                if (!matchRevealed) {
                  revealMatch(0);
                  refocusSearch();
                  return;
                }
                stepMatch(1);
              }}
            >
              <ChevronDown size={12} aria-hidden />
            </button>
          </div>
        ) : null}
      </div>

      <div className="twofa-adm-note-editor">
        {hasSearch && value ? (
          <div ref={backdropRef} className="twofa-adm-note-editor__backdrop" aria-hidden>
            <TwofaNoteSearchMirror
              text={value}
              ranges={matchRanges}
              activeIndex={mirrorActiveIndex}
            />
          </div>
        ) : null}
        <textarea
          ref={textareaRef}
          className={`${TWOFA_ADM_CONTROL_CLASS} twofa-adm-note-textarea${hasSearch && value ? " twofa-adm-note-textarea--searching" : ""}`}
          name={name}
          autoComplete="off"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={syncBackdropScroll}
          rows={8}
        />
      </div>
    </>
  );
}
