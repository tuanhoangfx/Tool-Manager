import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { hashSharePassword } from "./shareUtils";

export type PublicShareRow = {
  id: string;
  title: string;
  body_md: string;
  cookie_snapshot: unknown;
  share_password_hash: string | null;
  share_enabled: boolean;
  share_token: string | null;
};

export function usePublicShare(token: string | null) {
  const [row, setRow] = useState<PublicShareRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) {
      setRow(null);
      return;
    }
    setLoading(true);
    setError("");
    const { data, error: err } = await supabase
      .from("notes")
      .select("id, title, body_md, cookie_snapshot, share_password_hash, share_enabled, share_token")
      .eq("share_token", token)
      .eq("share_enabled", true)
      .maybeSingle();

    if (err) {
      setError(err.message);
      setRow(null);
    } else if (!data) {
      setError("Link không hợp lệ hoặc đã tắt share.");
      setRow(null);
    } else {
      setRow(data as PublicShareRow);
      if (!data.share_password_hash) setUnlocked(true);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const verifyPassword = useCallback(
    async (password: string) => {
      if (!row) return false;
      if (!row.share_password_hash) {
        setUnlocked(true);
        return true;
      }
      const hash = await hashSharePassword(password, row.id);
      if (hash === row.share_password_hash) {
        setUnlocked(true);
        return true;
      }
      return false;
    },
    [row],
  );

  return { row, loading, error, unlocked, verifyPassword, refresh };
}
