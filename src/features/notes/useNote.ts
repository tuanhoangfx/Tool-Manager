import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { slugifyTitle } from "./noteUtils";
import { generateShareToken, hashSharePassword } from "./shareUtils";
import type { NoteRow } from "./types";

export type NoteDraft = {
  title: string;
  slug: string;
  domain: string;
  body_md: string;
  pinned: boolean;
  share_enabled: boolean;
  /** Plain password — hashed on save when non-empty */
  share_password?: string;
};

export function useNote(session: Session | null, noteId: string | null) {
  const [note, setNote] = useState<NoteRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!session || !noteId) {
      setNote(null);
      return;
    }
    setLoading(true);
    setError("");
    const { data, error: err } = await supabase.from("notes").select("*").eq("id", noteId).maybeSingle();
    if (err) {
      setError(err.message);
      setNote(null);
    } else {
      setNote((data as NoteRow | null) ?? null);
    }
    setLoading(false);
  }, [session, noteId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(
    async (draft: NoteDraft) => {
      if (!session || !noteId) throw new Error("Không có note");
      setSaving(true);
      const slug = slugifyTitle(draft.title, draft.slug || "note");

      let share_token = note?.share_token ?? null;
      let share_password_hash = note?.share_password_hash ?? null;

      if (draft.share_enabled) {
        if (!share_token) share_token = generateShareToken();
        if (draft.share_password?.trim()) {
          share_password_hash = await hashSharePassword(draft.share_password, noteId);
        }
      } else {
        share_token = null;
        share_password_hash = null;
      }

      const { data, error: err } = await supabase
        .from("notes")
        .update({
          title: draft.title.trim() || "Untitled",
          slug,
          domain: draft.domain.trim(),
          body_md: draft.body_md,
          pinned: draft.pinned,
          share_enabled: draft.share_enabled,
          share_token,
          share_password_hash,
        })
        .eq("id", noteId)
        .select("*")
        .single();
      setSaving(false);
      if (err) throw err;
      setNote(data as NoteRow);
      return data as NoteRow;
    },
    [session, noteId, note?.share_token, note?.share_password_hash],
  );

  return { note, loading, error, saving, refresh, save };
}
