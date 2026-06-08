export type DiffSideTone = "neutral" | "add" | "remove";

export type InlineWordSegment = {
  type: "same" | "add" | "remove";
  text: string;
};

export type SideBySideDiffRow = {
  left: string | null;
  right: string | null;
  leftTone: DiffSideTone;
  rightTone: DiffSideTone;
  /** Word-level highlights when line changed (paired remove+add). */
  leftWords?: InlineWordSegment[];
  rightWords?: InlineWordSegment[];
};

function splitLines(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n");
  if (!normalized) return [""];
  return normalized.split("\n");
}

function tokenizeWords(line: string): string[] {
  if (!line) return [];
  return line.split(/(\s+)/).filter((part) => part.length > 0);
}

function lcsTable(a: string[], b: string[]) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array<number>(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp;
}

function traceWordSegments(oldTokens: string[], newTokens: string[]) {
  const dp = lcsTable(oldTokens, newTokens);
  const oldRev: InlineWordSegment[] = [];
  const newRev: InlineWordSegment[] = [];
  let i = oldTokens.length;
  let j = newTokens.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldTokens[i - 1] === newTokens[j - 1]) {
      oldRev.push({ type: "same", text: oldTokens[i - 1] });
      newRev.push({ type: "same", text: newTokens[j - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      newRev.push({ type: "add", text: newTokens[j - 1] });
      j--;
    } else {
      oldRev.push({ type: "remove", text: oldTokens[i - 1] });
      i--;
    }
  }

  return {
    oldSegments: oldRev.reverse(),
    newSegments: newRev.reverse(),
  };
}

/** Word-level diff for one changed line pair — old = snapshot, new = current. */
export function diffWordSegments(oldLine: string, newLine: string) {
  const { oldSegments, newSegments } = traceWordSegments(tokenizeWords(oldLine), tokenizeWords(newLine));
  return { oldSegments, newSegments };
}

function allWordSegments(text: string, type: "add" | "remove"): InlineWordSegment[] {
  return tokenizeWords(text).map((part) => ({ type, text: part }));
}

/** Pair consecutive remove+add lines and attach word-level segments. */
export function enrichDiffRowsWithWords(rows: SideBySideDiffRow[]): SideBySideDiffRow[] {
  const out: SideBySideDiffRow[] = [];
  let i = 0;
  while (i < rows.length) {
    const row = rows[i];
    const next = rows[i + 1];
    if (row.rightTone === "remove" && row.left === null && next?.leftTone === "add" && next.right === null) {
      const { oldSegments, newSegments } = diffWordSegments(row.right ?? "", next.left ?? "");
      out.push({
        left: next.left,
        right: row.right,
        leftTone: "add",
        rightTone: "remove",
        leftWords: newSegments,
        rightWords: oldSegments,
      });
      i += 2;
      continue;
    }
    if (row.leftTone === "add" && row.left && !row.leftWords) {
      out.push({ ...row, leftWords: allWordSegments(row.left, "add") });
    } else if (row.rightTone === "remove" && row.right && !row.rightWords) {
      out.push({ ...row, rightWords: allWordSegments(row.right, "remove") });
    } else {
      out.push(row);
    }
    i++;
  }
  return out;
}

/** Line-aligned side-by-side diff — `oldText` = right/past, `newText` = left/current. */
export function diffSideBySide(oldText: string, newText: string): SideBySideDiffRow[] {
  const oldLines = splitLines(oldText);
  const newLines = splitLines(newText);
  const dp = lcsTable(oldLines, newLines);
  const rows: SideBySideDiffRow[] = [];
  let i = oldLines.length;
  let j = newLines.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      rows.push({
        left: newLines[j - 1],
        right: oldLines[i - 1],
        leftTone: "neutral",
        rightTone: "neutral",
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rows.push({
        left: newLines[j - 1],
        right: null,
        leftTone: "add",
        rightTone: "neutral",
      });
      j--;
    } else {
      rows.push({
        left: null,
        right: oldLines[i - 1],
        leftTone: "neutral",
        rightTone: "remove",
      });
      i--;
    }
  }

  return rows.reverse();
}

/** Line diff + word-level highlights for changed lines. */
export function diffSideBySideWithWords(oldText: string, newText: string): SideBySideDiffRow[] {
  return enrichDiffRowsWithWords(diffSideBySide(oldText, newText));
}
