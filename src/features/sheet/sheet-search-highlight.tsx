import { findSheetSearchMatchRanges } from "./sheet-search-fold";

type TextPart = { text: string; match: boolean };

export function splitTextByQuery(text: string, query: string): TextPart[] {
  const q = query.trim();
  if (!q || !text) return [{ text, match: false }];

  const ranges = findSheetSearchMatchRanges(text, q);
  if (ranges.length === 0) return [{ text, match: false }];

  const parts: TextPart[] = [];
  let cursor = 0;
  for (const { start, end } of ranges) {
    if (start > cursor) parts.push({ text: text.slice(cursor, start), match: false });
    parts.push({ text: text.slice(start, end), match: true });
    cursor = end;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), match: false });
  return parts;
}

/** Count non-overlapping query occurrences across grid cells (toolbar match chip). */
export function countSheetSearchMatches(rows: string[][], query: string): number {
  const q = query.trim();
  if (!q) return 0;
  let count = 0;
  for (const row of rows) {
    for (const cell of row) {
      count += findSheetSearchMatchRanges(String(cell ?? ""), q).length;
    }
  }
  return count;
}

export function SheetHighlightedText({ text, query }: { text: string; query?: string }) {
  const q = query?.trim();
  if (!q) return <>{text}</>;
  return (
    <>
      {splitTextByQuery(text, q).map((part, i) =>
        part.match ? (
          <mark key={i} className="sheet-search-highlight">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}
