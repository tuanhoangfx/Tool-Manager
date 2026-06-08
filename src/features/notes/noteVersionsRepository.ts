import { ensureDataBoxAuth } from "../../lib/ensure-data-box-auth";
import { supabase } from "../../lib/supabase";
import { readNotesVersionIntervalMinutes } from "./notes-version-prefs";
import type { NoteVersionDetail, NoteVersionListItem, NoteVersionSource } from "./noteVersionUtils";
import { normalizeNoteVersionListItem } from "./noteVersionUtils";

type CreateVersionResult = {
  ok: boolean;
  created: boolean;
  reason?: string;
  version_id?: string;
};

type ListVersionsResult = {
  ok: boolean;
  versions: NoteVersionListItem[];
};

type RestoreResult = {
  ok: boolean;
  error?: string;
  note?: {
    id: string;
    title: string;
    slug: string;
    body_md: string;
    updated_at: string;
  };
};

async function requireSession() {
  const session = await ensureDataBoxAuth();
  if (!session) throw new Error("Sign in required for version history.");
}

export async function createNoteVersionIfChanged(
  noteId: string,
  source: NoteVersionSource,
  opts?: { label?: string; minIntervalMinutes?: number; title?: string; bodyMd?: string },
): Promise<CreateVersionResult> {
  await requireSession();
  const { data, error } = await supabase.rpc("note_create_version_if_changed", {
    p_note_id: noteId,
    p_source: source,
    p_label: opts?.label ?? null,
    p_min_interval_minutes: opts?.minIntervalMinutes ?? readNotesVersionIntervalMinutes(),
    p_title: opts?.title ?? null,
    p_body_md: opts?.bodyMd ?? null,
  });
  if (error) throw error;
  return data as CreateVersionResult;
}

type GetVersionResult = {
  ok: boolean;
  error?: string;
  version?: NoteVersionDetail;
};

export async function getNoteVersion(versionId: string): Promise<NoteVersionDetail> {
  await requireSession();
  const { data, error } = await supabase.rpc("note_version_get", {
    p_version_id: versionId,
  });
  if (error) throw error;
  const payload = data as GetVersionResult;
  if (!payload.ok || !payload.version) {
    throw new Error(payload.error ?? "Version not found");
  }
  return payload.version;
}

export async function listNoteVersions(noteId: string, limit = 50): Promise<NoteVersionListItem[]> {
  await requireSession();
  const { data, error } = await supabase.rpc("note_versions_list", {
    p_note_id: noteId,
    p_limit: limit,
  });
  if (error) throw error;
  const payload = data as ListVersionsResult;
  return (payload.versions ?? []).map((row) => normalizeNoteVersionListItem(row));
}

export async function restoreNoteVersion(versionId: string): Promise<RestoreResult> {
  await requireSession();
  const { data, error } = await supabase.rpc("note_version_restore", {
    p_version_id: versionId,
  });
  if (error) throw error;
  return data as RestoreResult;
}

type DeleteVersionResult = {
  ok: boolean;
  error?: string;
  deleted_id?: string;
  note_id?: string;
};

export async function deleteNoteVersion(versionId: string): Promise<DeleteVersionResult> {
  await requireSession();
  const { data, error } = await supabase.rpc("note_version_delete", {
    p_version_id: versionId,
  });
  if (error) throw error;
  return data as DeleteVersionResult;
}

export function isMissingNoteVersionsRpc(message: string): boolean {
  return /note_(create_version_if_changed|versions_list|version_(restore|delete))/i.test(message) &&
    /does not exist|42883|PGRST202/i.test(message);
}
