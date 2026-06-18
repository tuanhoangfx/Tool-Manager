export type TaskSearchHighlight = {
  idTerms: string[];
  titleTerms: string[];
};

export function extractNumericSearchTerm(term: string) {
  const trimmed = term.trim();
  if (!trimmed) return null;
  const numericPart = trimmed.startsWith("#") ? trimmed.slice(1).trim() : trimmed;
  return /^\d+$/.test(numericPart) ? numericPart : null;
}

/** Highlight terms aligned with `matchesTodoTaskSearch` — id badge vs title. */
export function getTaskSearchHighlight(searchTerm: string): TaskSearchHighlight | null {
  const trimmed = searchTerm.trim();
  if (!trimmed) return null;

  const numericOnly = extractNumericSearchTerm(trimmed);
  if (numericOnly !== null) {
    return { idTerms: [numericOnly], titleTerms: [] };
  }

  const digits = trimmed.replace(/\D/g, "");
  const letters = trimmed.replace(/[\d#]/g, "").trim().toLowerCase();

  if (digits && letters) {
    return { idTerms: [digits], titleTerms: [letters] };
  }

  const lower = trimmed.toLowerCase();
  return {
    idTerms: digits.length > 0 ? [digits] : [],
    titleTerms: lower ? [lower] : [],
  };
}

export type HighlightSegment = { text: string; highlight: boolean };

export function buildHighlightSegments(text: string, terms: string[]): HighlightSegment[] {
  if (!text || terms.length === 0) return [{ text, highlight: false }];

  const ranges: { start: number; end: number }[] = [];
  const lower = text.toLowerCase();

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

  if (ranges.length === 0) return [{ text, highlight: false }];

  ranges.sort((a, b) => a.start - b.start);
  const merged = [ranges[0]];
  for (let i = 1; i < ranges.length; i++) {
    const last = merged[merged.length - 1];
    const cur = ranges[i];
    if (cur.start <= last.end) last.end = Math.max(last.end, cur.end);
    else merged.push(cur);
  }

  const segments: HighlightSegment[] = [];
  let pos = 0;
  for (const range of merged) {
    if (pos < range.start) segments.push({ text: text.slice(pos, range.start), highlight: false });
    segments.push({ text: text.slice(range.start, range.end), highlight: true });
    pos = range.end;
  }
  if (pos < text.length) segments.push({ text: text.slice(pos), highlight: false });
  return segments;
}
