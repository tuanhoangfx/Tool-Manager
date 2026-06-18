function foldChar(ch: string): string {
  if (ch === "đ") return "d";
  if (ch === "Đ") return "D";
  return ch.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Accent-insensitive fold for sheet search — "xác nhận" → "xac nhan". */
export function foldSheetSearchText(value: string): string {
  let out = "";
  for (const ch of Array.from(value)) {
    out += foldChar(ch);
  }
  return out.toLowerCase();
}

export function sheetTextIncludesQuery(text: string, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  const folded = foldSheetSearchText(text);
  const needle = foldSheetSearchText(q);
  return needle.length > 0 && folded.includes(needle);
}

type FoldIndex = {
  folded: string;
  startAt: number[];
  endAt: number[];
};

function buildFoldIndex(text: string): FoldIndex {
  const startAt: number[] = [];
  const endAt: number[] = [];
  let folded = "";
  let offset = 0;
  for (const ch of Array.from(text)) {
    const f = foldChar(ch).toLowerCase();
    const chLen = ch.length;
    for (let j = 0; j < f.length; j++) {
      folded += f[j]!;
      startAt.push(offset);
      endAt.push(offset + chLen);
    }
    offset += chLen;
  }
  return { folded, startAt, endAt };
}

/** Original-text [start, end) spans matching query with accent folding. */
export function findSheetSearchMatchRanges(text: string, query: string): Array<{ start: number; end: number }> {
  const q = query.trim();
  if (!q || !text) return [];
  const { folded, startAt, endAt } = buildFoldIndex(text);
  const needle = foldSheetSearchText(q);
  if (!needle) return [];

  const ranges: Array<{ start: number; end: number }> = [];
  let from = 0;
  while (from <= folded.length - needle.length) {
    const idx = folded.indexOf(needle, from);
    if (idx === -1) break;
    ranges.push({
      start: startAt[idx]!,
      end: endAt[idx + needle.length - 1]!,
    });
    from = idx + needle.length;
  }
  return ranges;
}
