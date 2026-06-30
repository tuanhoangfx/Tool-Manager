import { createClient } from "@supabase/supabase-js";
import { WorkspaceAuthGate, createWorkspaceAuthGate } from "@tool-workspace/hub-ui";
import { ToolAvatar } from "../../components/ToolAvatar";
import { DATA_BOX_PRODUCT } from "../../lib/app-meta";
import { relaySessionsToExtension } from "../../lib/relay-extension-sessions";
import { toolIconName, toolSvgIcon } from "../../lib/visual";
import {
  HUB_SUPABASE_ANON_KEY,
  HUB_SUPABASE_URL,
  isHubSupabaseConfigured,
} from "../../lib/hub-supabase-env";
import { setOfflineMode } from "../../lib/offlineMode";
import { applyHubIdentitySession } from "../../lib/supabase-identity";
import { signInWorkspaceDual } from "../../lib/workspace-dual-auth";
import { useNotesAuth } from "./AuthSessionProvider";

type Props = {
  onAuthed?: () => void;
  variant?: "notes" | "cookie-auto" | "twofa" | "system";
};

/** Data Box sign-in gate — golden createWorkspaceAuthGate factory. */
export function NotesAuthGate({ onAuthed, variant = "notes" }: Props) {
  const { adoptSession } = useNotesAuth();
  const enzyEmbed = import.meta.env.VITE_SITE_PROFILE === "enzy";

  return (
    <WorkspaceAuthGate
      {...createWorkspaceAuthGate({
        code: "P0020",
        variant,
        ...(enzyEmbed
          ? {
              title: "Welcome to ENZY",
              toolName: "ENZY",
              tagline: "Pin Lithium — tasks & customers",
            }
          : {}),
        headerLeading: enzyEmbed ? (
          <div
            className="grid h-9 w-9 place-items-center rounded-[10px] bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm"
            aria-hidden
          >
            <span className="text-[11px] font-bold tracking-wide">EZ</span>
          </div>
        ) : (
          <ToolAvatar
            code={DATA_BOX_PRODUCT.code}
            iconName={toolIconName({ code: DATA_BOX_PRODUCT.code })}
            svgSrc={toolSvgIcon({ code: DATA_BOX_PRODUCT.code }) ?? undefined}
            size="sm"
          />
        ),
        onAuthed,
        profileRoleClient: isHubSupabaseConfigured
          ? createClient(HUB_SUPABASE_URL, HUB_SUPABASE_ANON_KEY, {
              auth: { persistSession: false, autoRefreshToken: false },
            })
          : null,
        onPrepareProfileRoleClient: async () => {
          await applyHubIdentitySession();
        },
        onSubmit: async (login, password, mode) => {
          const { identitySession, dataSession, dataError } = await signInWorkspaceDual(
            login,
            password,
            mode === "signup" ? "signup" : "signin",
          );
          if (!dataSession) {
            const message =
              typeof dataError === "string" && dataError.trim()
                ? dataError
                : "Tool Hub sign-in succeeded but Data Box session failed. Check Data Box Supabase status or try again.";
            return { error: message };
          }
          setOfflineMode(false);
          adoptSession(dataSession);
          relaySessionsToExtension(identitySession, dataSession);
        },
        forgotPassword: {
          isHubConfigured: () => isHubSupabaseConfigured,
          resetPasswordForEmail: async (authEmail, redirectTo) => {
            const hub = createClient(HUB_SUPABASE_URL, HUB_SUPABASE_ANON_KEY, {
              auth: { persistSession: false, autoRefreshToken: false },
            });
            return hub.auth.resetPasswordForEmail(authEmail, { redirectTo });
          },
        },
      })}
    />
  );
}
