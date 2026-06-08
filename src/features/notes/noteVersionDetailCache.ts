import { getNoteVersion } from "./noteVersionsRepository";
import type { NoteVersionDetail, NoteVersionListItem } from "./noteVersionUtils";

const pending = new Map<string, Promise<NoteVersionDetail>>();
const resolved = new Map<string, NoteVersionDetail>();

function commitNoteVersion(detail: NoteVersionDetail) {
  resolved.set(detail.id, detail);
  pending.set(detail.id, Promise.resolve(detail));
}

export function listItemToDetail(item: NoteVersionListItem): NoteVersionDetail | null {
  if (!item.body_md || item.body_truncated) return null;
  return {
    id: item.id,
    note_id: item.note_id,
    title: item.title,
    body_md: item.body_md,
    content_hash: item.content_hash,
    source: item.source,
    label: item.label,
    created_at: item.created_at,
  };
}

export function versionNeedsFullBody(item: NoteVersionListItem | null | undefined): boolean {
  if (!item) return true;
  return item.body_truncated || !item.body_md;
}

/** True when compare uses a truncated prefix (full body not loaded yet). */
export function isSnapshotPartial(
  listItem: NoteVersionListItem | null | undefined,
  detail: NoteVersionDetail | null,
): boolean {
  if (!listItem?.body_truncated) return false;
  if (!detail) return true;
  return detail.body_md.length < listItem.body_length;
}

/** Seed sync cache from list RPC (full body only). */
export function seedNoteVersionsFromList(versions: NoteVersionListItem[]) {
  for (const item of versions) {
    const detail = listItemToDetail(item);
    if (detail) commitNoteVersion(detail);
  }
}

/** Seed list bodies + background-fetch truncated snapshots. */
export function prefetchAllNoteVersionsFromList(versions: NoteVersionListItem[]) {
  seedNoteVersionsFromList(versions);
  for (const item of versions) {
    if (versionNeedsFullBody(item)) prefetchNoteVersion(item.id);
  }
}

export function peekNoteVersion(versionId: string): NoteVersionDetail | null {
  return resolved.get(versionId) ?? null;
}

export function prefetchNoteVersion(versionId: string) {
  if (!versionId || resolved.has(versionId) || pending.has(versionId)) return;
  pending.set(
    versionId,
    getNoteVersion(versionId)
      .then((detail) => {
        commitNoteVersion(detail);
        return detail;
      })
      .catch((err) => {
        pending.delete(versionId);
        throw err;
      }),
  );
}

/** Warm selected + adjacent snapshot bodies (default compare: vs Previous). */
export function prefetchNoteVersionPair(selectedId: string | null, previousId: string | null) {
  if (selectedId) prefetchNoteVersion(selectedId);
  if (previousId) prefetchNoteVersion(previousId);
}

export function prefetchHistoryVersions(versions: NoteVersionListItem[], selectedId: string | null) {
  prefetchAllNoteVersionsFromList(versions);
  const vid = selectedId ?? versions[0]?.id ?? null;
  if (!vid) return;
  const idx = versions.findIndex((v) => v.id === vid);
  const prevId = idx >= 0 && idx < versions.length - 1 ? (versions[idx + 1]?.id ?? null) : null;
  if (prevId) prefetchNoteVersion(prevId);
  if (vid) prefetchNoteVersion(vid);
}

export async function ensureFullNoteVersion(
  versionId: string,
  listItem?: NoteVersionListItem | null,
): Promise<NoteVersionDetail> {
  const cached = peekNoteVersion(versionId);
  if (cached && listItem?.body_truncated && cached.body_md.length < listItem.body_length) {
    return loadNoteVersion(versionId);
  }
  if (cached && !versionNeedsFullBody(listItem)) return cached;
  if (cached && !listItem) return cached;
  return loadNoteVersion(versionId);
}

export async function loadNoteVersion(versionId: string): Promise<NoteVersionDetail> {
  const cached = peekNoteVersion(versionId);
  if (cached) return cached;
  prefetchNoteVersion(versionId);
  const detail = await pending.get(versionId)!;
  commitNoteVersion(detail);
  return detail;
}

export function clearNoteVersionDetailCache() {
  pending.clear();
  resolved.clear();
}

export function invalidateNoteVersionDetailCache(versionId: string) {
  pending.delete(versionId);
  resolved.delete(versionId);
}
