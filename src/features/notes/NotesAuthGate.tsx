import { createClient } from "@supabase/supabase-js";
import { WorkspaceAuthGate, createWorkspaceAuthGate } from "@tool-workspace/hub-ui";
import { ToolAvatar } from "../../components/ToolAvatar";
import { relaySessionsToExtension } from "../../lib/relay-extension-sessions";
import { toolIconName, toolSvgIcon } from "../../lib/visual";
import {
  HUB_SUPABASE_ANON_KEY,
  HUB_SUPABASE_URL,
  isHubSupabaseConfigured,
} from "../../lib/hub-supabase-env";
import { setOfflineMode } from "../../lib/offlineMode";
import { signInWorkspaceDual } from "../../lib/workspace-dual-auth";
import { useNotesAuth } from "./useNotesAuth";

type Props = {
  onAuthed?: () => void;
  variant?: "notes" | "cookie-auto" | "twofa" | "system";
};

/** Data Box sign-in gate — golden createWorkspaceAuthGate factory. */
export function NotesAuthGate({ onAuthed, variant = "notes" }: Props) {
  const { adoptSession } = useNotesAuth();

  return (
    <WorkspaceAuthGate
      {...createWorkspaceAuthGate({
        code: "P0020",
        variant,
        headerLeading: (
          <ToolAvatar
            code="P0020"
            iconName={toolIconName({ code: "P0020" })}
            svgSrc={toolSvgIcon({ code: "P0020" }) ?? undefined}
            size="sm"
          />
        ),
        onAuthed,
        onAnonymous: () => setOfflineMode(true),
        onSubmit: async (login, password, mode) => {
          const { identitySession, dataSession, dataError } = await signInWorkspaceDual(
            login,
            password,
            mode === "signup" ? "signup" : "signin",
          );
          if (!dataSession) {
            return {
              error:
                dataError ??
                "Tool Hub sign-in succeeded but Data Box session failed. Check Data Box Supabase status or try again.",
            };
          }
          adoptSession(dataSession);
          relaySessionsToExtension(identitySession, dataSession);
        },
        forgotPassword: {
          isHubConfigured: () => isHubSupabaseConfigured,
          resetPasswordForEmail: async (authEmail, redirectTo) => {
            const hub = createClient(HUB_SUPABASE_URL, HUB_SUPABASE_ANON_KEY);
            return hub.auth.resetPasswordForEmail(authEmail, { redirectTo });
          },
        },
      })}
    />
  );
}
