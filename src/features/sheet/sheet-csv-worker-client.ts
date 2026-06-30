import { estimateCsvLineCount, parseCsvToGrid, shouldLazyParseSheetCsv, type SheetCsvParseResult } from "./sheet-csv-grid";

export const SHEET_CSV_WORKER_LINE_THRESHOLD = 1000;

type Pending = {
  resolve: (value: SheetCsvParseResult) => void;
  reject: (reason: Error) => void;
};

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, Pending>();

function getWorker(): Worker | null {
  if (typeof Worker === "undefined") return null;
  if (!worker) {
    worker = new Worker(new URL("./sheet-csv-parse.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<{ id: number; result?: SheetCsvParseResult; error?: string }>) => {
      const job = pending.get(event.data.id);
      if (!job) return;
      pending.delete(event.data.id);
      if (event.data.error) job.reject(new Error(event.data.error));
      else if (event.data.result) job.resolve(event.data.result);
      else job.reject(new Error("Sheet CSV worker returned empty result"));
    };
    worker.onerror = () => {
      for (const job of pending.values()) job.reject(new Error("Sheet CSV worker failed"));
      pending.clear();
    };
  }
  return worker;
}

export function shouldParseCsvInWorker(csv: string): boolean {
  return (
    estimateCsvLineCount(csv) > SHEET_CSV_WORKER_LINE_THRESHOLD || shouldLazyParseSheetCsv(csv)
  );
}

export function parseCsvToGridInWorker(
  csv: string,
  opts?: { headerRowIndex?: number; maxDataRows?: number },
): Promise<SheetCsvParseResult> {
  const w = getWorker();
  if (!w || !shouldParseCsvInWorker(csv)) {
    return Promise.resolve(parseCsvToGrid(csv, opts));
  }
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ id, csv, opts });
  });
}

export function terminateSheetCsvWorker(): void {
  worker?.terminate();
  worker = null;
  pending.clear();
}
