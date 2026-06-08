import { createClient } from "@supabase/supabase-js";
import { canUseEmailPasswordRecovery, resolveHubLogin } from "@tool-workspace/hub-identity";
import { HubAuthGate } from "@tool-workspace/hub-ui";
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

const ANONYMOUS_HINT: Record<NonNullable<Props["variant"]>, string> = {
  notes: "Browse notes locally. Cloud sync requires sign-in.",
  "cookie-auto": "Use local cookie jar only. Cloud vault sync requires sign-in.",
  twofa: "Limited 2FA access. Full vault requires sign-in.",
  system: "Browse system tools locally. Admin features require sign-in.",
};

/** Data Box sign-in gate — golden modal with Sign In / Sign Up / Anonymous. */
export function NotesAuthGate({ onAuthed, variant = "notes" }: Props) {
  const { adoptSession } = useNotesAuth();

  return (
    <HubAuthGate
      onAuthed={onAuthed}
      onAnonymous={() => setOfflineMode(true)}
      modal={{
        title: "Welcome to Data Box",
        toolInfo: {
          code: "P0020",
          name: "Data Box",
          tagline: "Notes, cookies & 2FA vault",
        },
        anonymousHint: ANONYMOUS_HINT[variant],
        errorOptions: { toolHubHint: true, dualWorkspace: true },
        headerLeading: (
          <ToolAvatar
            code="P0020"
            iconName={toolIconName({ code: "P0020" })}
            svgSrc={toolSvgIcon({ code: "P0020" }) ?? undefined}
            size="sm"
          />
        ),
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
        onForgotPassword: async (login) => {
          const resolved = resolveHubLogin(login);
          if (!resolved.isEmailLogin || !canUseEmailPasswordRecovery(resolved.authEmail)) {
            return "Link email on Tool Hub (Account), or ask an admin to reset your password.";
          }
          if (!isHubSupabaseConfigured) return "Tool Hub Supabase is not configured.";
          const hub = createClient(HUB_SUPABASE_URL, HUB_SUPABASE_ANON_KEY);
          const { error } = await hub.auth.resetPasswordForEmail(resolved.authEmail, {
            redirectTo: `${window.location.origin}/`,
          });
          if (error) return error.message;
          return "Check your inbox for a Hub password reset link.";
        },
      }}
    />
  );
}
