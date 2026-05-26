import { useCallback, useEffect, useState } from "react";
import { fetchPublicShareNote, type PublicShareRow } from "./publicShareRepository";

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
    const res = await fetchPublicShareNote(token);

    if (!res.ok && !res.note) {
      setError(res.error);
      setRow(null);
    } else if (res.note) {
      setRow(res.note);
      setUnlocked(!res.locked);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const verifyPassword = useCallback(
    async (password: string) => {
      if (!row || !token) return false;
      if (!row.requires_password) {
        setUnlocked(true);
        return true;
      }
      const res = await fetchPublicShareNote(token, password);
      if (res.ok) {
        setRow(res.note);
        setUnlocked(true);
        return true;
      }
      return false;
    },
    [row, token],
  );

  return { row, loading, error, unlocked, verifyPassword, refresh };
}
