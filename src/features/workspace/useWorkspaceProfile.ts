import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Profile } from "../todo/types";
import { ensureWorkspaceAuthReady, ensureWorkspaceProfile } from "../../lib/workspace-profile";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type WorkspaceProfileState = {
  profile: Profile | null;
  loadingProfile: boolean;
  profileError: string | null;
  refreshProfile: (user: Session["user"]) => Promise<void>;
};

/** Shared profile loader for Todo (and future workspace tabs). */
export function useWorkspaceProfile(session: Session | null): WorkspaceProfileState {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(Boolean(session));
  const [profileError, setProfileError] = useState<string | null>(null);

  const refreshProfile = useCallback(async (user: Session["user"]) => {
    if (!user) return;
    setLoadingProfile(true);
    setProfileError(null);

    let attempts = 0;
    const maxAttempts = 3;
    while (attempts < maxAttempts) {
      try {
        const nextProfile = await ensureWorkspaceProfile(user);
        if (!nextProfile) {
          throw new Error("Data Box session is not ready. Sign in again.");
        }
        setProfile(nextProfile);
        setLoadingProfile(false);
        return;
      } catch (error: unknown) {
        attempts++;
        const message = error instanceof Error ? error.message : String(error);
        const isNetworkError =
          message === "Failed to fetch" || message.includes("NetworkError");
        if (attempts >= maxAttempts || !isNetworkError) {
          console.error("Error loading workspace profile:", message);
          setProfile(null);
          setProfileError(message);
          setLoadingProfile(false);
          return;
        }
        await wait(500 * 2 ** (attempts - 1));
      }
    }
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      setProfileError(null);
      setLoadingProfile(false);
      return;
    }
    if (!profile || profile.id !== session.user.id) {
      void refreshProfile(session.user);
    } else {
      setLoadingProfile(false);
    }
  }, [session, profile, refreshProfile]);

  useEffect(() => {
    void ensureWorkspaceAuthReady();
  }, [session?.access_token]);

  return { profile, loadingProfile, profileError, refreshProfile };
}
