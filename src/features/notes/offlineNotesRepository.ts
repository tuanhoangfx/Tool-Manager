import type { NoteRow } from "./types";

const DB_NAME = "p0020-offline-v1";
const STORE = "notes";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const store = t.objectStore(STORE);
        const req = run(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
        t.onerror = () => {
          reject(t.error);
          db.close();
        };
      }),
  );
}

export async function listOfflineNotes(): Promise<NoteRow[]> {
  const rows = await tx("readonly", (s) => s.getAll());
  return (rows as NoteRow[]).sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
}

export async function getOfflineNote(id: string): Promise<NoteRow | null> {
  const row = await tx("readonly", (s) => s.get(id));
  return (row as NoteRow | undefined) ?? null;
}

export async function upsertOfflineNote(row: NoteRow): Promise<NoteRow> {
  await tx("readwrite", (s) => s.put(row));
  return row;
}

export async function deleteOfflineNote(id: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(id));
}

