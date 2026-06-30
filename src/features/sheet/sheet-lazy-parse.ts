import {
  parseCsvToGrid,
  shouldLazyParseSheetCsv,
  type SheetCsvParseResult,
} from "./sheet-csv-grid";
import { parseCsvToGridInWorker } from "./sheet-csv-worker-client";

export type PhasedSheetParseResult = SheetCsvParseResult & {
  loadingMoreRows: boolean;
};

export type PhasedSheetParseHandle = {
  cancel: () => void;
};

function scheduleBackgroundParse(task: () => void): number {
  if (typeof globalThis.requestIdleCallback === "function") {
    return globalThis.requestIdleCallback(task, { timeout: 1200 });
  }
  return globalThis.setTimeout(task, 16) as unknown as number;
}

function cancelBackgroundParse(id: number): void {
  if (typeof globalThis.cancelIdleCallback === "function") globalThis.cancelIdleCallback(id);
  else globalThis.clearTimeout(id);
}

/** Fast initial chunk for large CSV, then merge full parse when idle. */
export function runPhasedSheetCsvParse(
  csv: string,
  opts: {
    headerRowIndex?: number;
    isActive: () => boolean;
  },
  onPartial: (result: PhasedSheetParseResult) => void,
  onComplete: (result: SheetCsvParseResult) => void,
): PhasedSheetParseHandle {
  if (!shouldLazyParseSheetCsv(csv)) {
    const result = parseCsvToGrid(csv, { headerRowIndex: opts.headerRowIndex });
    onPartial({ ...result, loadingMoreRows: false });
    onComplete(result);
    return { cancel: () => {} };
  }

  const initial = parseCsvToGrid(csv, {
    headerRowIndex: opts.headerRowIndex,
    maxDataRows: 500,
  });
  onPartial({ ...initial, loadingMoreRows: true });

  let cancelled = false;
  const idleId = scheduleBackgroundParse(() => {
    if (cancelled || !opts.isActive()) return;
    void parseCsvToGridInWorker(csv, { headerRowIndex: initial.headerRowIndex }).then((full) => {
      if (cancelled || !opts.isActive()) return;
      onComplete(full);
    });
  });

  return {
    cancel: () => {
      cancelled = true;
      cancelBackgroundParse(idleId);
    },
  };
}
