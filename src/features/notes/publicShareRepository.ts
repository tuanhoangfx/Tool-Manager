import { supabase } from "../../lib/supabase";

export type PublicShareRow = {
  id: string;
  title: string;
  body_md: string;
  cookie_snapshot: unknown;
  share_enabled: boolean;
  share_can_edit: boolean;
  share_token: string | null;
  requires_password: boolean;
};

type ShareRpcPayload = {
  ok?: boolean;
  error?: string;
  locked?: boolean;
  note?: PublicShareRow;
};

export async function fetchPublicShareNote(token: string, password?: string) {
  const { data, error } = await supabase.rpc("note_public_share_get", {
    p_token: token,
    p_password: password?.trim() || null,
  });

  if (error) return { ok: false as const, error: error.message };
  const payload = data as ShareRpcPayload | null;
  if (!payload?.ok || !payload.note) {
    return {
      ok: false as const,
      error: payload?.error ?? "Invalid link: sharing disabled or password is incorrect.",
      locked: payload?.locked === true,
      note: payload?.note ?? null,
    };
  }
  const note = {
    ...payload.note,
    share_can_edit: Boolean(payload.note.share_can_edit),
  };
  return { ok: true as const, note, locked: payload.locked === true };
}

export async function savePublicShareNote(
  token: string,
  draft: { title: string; body_md: string },
  password?: string,
) {
  const { data, error } = await supabase.rpc("note_public_share_save", {
    p_token: token,
    p_password: password?.trim() || null,
    p_title: draft.title,
    p_body_md: draft.body_md,
  });
  if (error) return { ok: false as const, error: error.message };
  const payload = data as { ok?: boolean; error?: string } | null;
  if (!payload?.ok) {
    return { ok: false as const, error: payload?.error ?? "Save failed." };
  }
  return { ok: true as const };
}
