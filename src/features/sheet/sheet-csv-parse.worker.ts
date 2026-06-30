import { parseCsvToGrid, type SheetCsvParseResult } from "./sheet-csv-grid";

export type SheetCsvWorkerRequest = {
  id: number;
  csv: string;
  opts?: { headerRowIndex?: number; maxDataRows?: number };
};

export type SheetCsvWorkerResponse = {
  id: number;
  result?: SheetCsvParseResult;
  error?: string;
};

self.onmessage = (event: MessageEvent<SheetCsvWorkerRequest>) => {
  const { id, csv, opts } = event.data;
  try {
    const result = parseCsvToGrid(csv, opts);
    const response: SheetCsvWorkerResponse = { id, result };
    self.postMessage(response);
  } catch (error) {
    const response: SheetCsvWorkerResponse = { id, error: error instanceof Error ? error.message : String(error) };
    self.postMessage(response);
  }
};
