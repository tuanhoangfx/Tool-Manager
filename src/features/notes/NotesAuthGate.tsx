import { useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { ToolAvatar } from "../../components/ToolAvatar";
import { relaySessionsToExtension } from "../../lib/relay-extension-sessions";
import { toolIconName, toolSvgIcon } from "../../lib/visual";
import { createClient } from "@supabase/supabase-js";
import { canUseEmailPasswordRecovery, resolveHubLogin } from "@tool-workspace/hub-identity";
import { setOfflineMode } from "../../lib/offlineMode";
import {
  HUB_SUPABASE_ANON_KEY,
  HUB_SUPABASE_URL,
  isHubSupabaseConfigured,
} from "../../lib/hub-supabase-env";
import { signInWorkspaceDual } from "../../lib/workspace-dual-auth";
import { useNotesAuth } from "./useNotesAuth";

type Props = {
  onAuthed?: () => void;
  variant?: "notes" | "cookie-auto" | "twofa" | "system";
};

type ModalProps = {
  onAuthed?: () => void;
  onClose: () => void;
};

/** Modal shell — aligned with P0004 HubAuthGate (Welcome + one subtitle, no field hints). */
const AUTH_MODAL_SUBTITLE =
  "Sign in to manage notes, 2FA, cookies, and tool access in your workspace.";

function AuthGateModal({ onAuthed, onClose }: ModalProps) {
  const { adoptSession } = useNotesAuth();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const normalizeAuthError = (raw: string) => {
    const msg = String(raw || "").trim();
    const lower = msg.toLowerCase();
    if (lower.includes("rate limit")) return "Temporary sign-in issue. Please try again in a moment.";
    if (lower.includes("invalid login credentials")) {
      return "Incorrect user ID/email or password. Use the same credentials as Tool Hub (P0004).";
    }
    if (lower.includes("exceed_egress_quota") || lower.includes("egress_quota")) {
      return "Data Box Supabase is paused (egress quota exceeded). Restore the project in Supabase Dashboard → Billing, or use Offline mode for local-only work.";
    }
    if (msg === "Failed to fetch" || lower.includes("networkerror") || lower.includes("load failed")) {
      return "Cannot reach Tool Hub or Data Box (network/DNS). Check VITE_HUB_SUPABASE_URL / VITE_SUPABASE_URL and Supabase project status.";
    }
    return msg || "Sign-in failed. Please try again.";
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const { identitySession, dataSession, dataError } = await signInWorkspaceDual(
        login,
        password,
        mode === "signup" ? "signup" : "signin",
      );
      if (!dataSession) {
        throw new Error(
          dataError ??
            "Tool Hub sign-in succeeded but Data Box session failed. Check Data Box Supabase status or try again.",
        );
      }
      adoptSession(dataSession);
      relaySessionsToExtension(identitySession, dataSession);
      setBusy(false);
      onAuthed?.();
    } catch (err) {
      setBusy(false);
      setMessage(normalizeAuthError(err instanceof Error ? err.message : String(err)));
    }
  };

  const onForgotPassword = async () => {
    setBusy(true);
    setMessage("");
    try {
      const resolved = resolveHubLogin(login);
      if (!resolved.isEmailLogin || !canUseEmailPasswordRecovery(resolved.authEmail)) {
        setMessage("Link email on Tool Hub (Account), or ask an admin to reset your password.");
        setBusy(false);
        return;
      }
      if (!isHubSupabaseConfigured) {
        setMessage("Tool Hub Supabase is not configured.");
        setBusy(false);
        return;
      }
      const hub = createClient(HUB_SUPABASE_URL, HUB_SUPABASE_ANON_KEY);
      const { error } = await hub.auth.resetPasswordForEmail(resolved.authEmail, {
        redirectTo: `${window.location.origin}/`,
      });
      setBusy(false);
      if (error) setMessage(error.message);
      else setMessage("Check your inbox for a Hub password reset link.");
    } catch (err) {
      setBusy(false);
      setMessage(err instanceof Error ? err.message : "Enter your linked email or user ID.");
    }
  };

  return createPortal(
    <div className="auth-gate-root" role="presentation">
      <div className="auth-gate-backdrop" aria-hidden onClick={onClose} />
      <div className="auth-gate-modal" role="dialog" aria-modal="true" aria-labelledby="auth-gate-title">
        <button
          type="button"
          className="auth-gate-close"
          onClick={onClose}
          aria-label="Close sign in"
        >
          <X size={16} />
        </button>
        <div className="auth-gate-brand">
          <ToolAvatar
            code="P0020"
            iconName={toolIconName({ code: "P0020" })}
            svgSrc={toolSvgIcon({ code: "P0020" }) ?? undefined}
            size="lg"
          />
        </div>
        <h2 id="auth-gate-title" className="auth-gate-title">
          Welcome to Data Box
        </h2>
        <p className="auth-gate-subtitle">{AUTH_MODAL_SUBTITLE}</p>

        <div className="auth-gate-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signin"}
            className={`auth-gate-tab${mode === "signin" ? " auth-gate-tab--active" : ""}`}
            onClick={() => {
              setMode("signin");
              setMessage("");
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            className={`auth-gate-tab${mode === "signup" ? " auth-gate-tab--active" : ""}`}
            onClick={() => {
              setMode("signup");
              setMessage("");
            }}
          >
            Sign Up
          </button>
        </div>

        <form className="auth-gate-form" onSubmit={(e) => void submit(e)}>
          <input
            className="field auth-gate-field w-full"
            type="text"
            placeholder="User ID or email"
            autoComplete="username"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            required
          />
          <div className="auth-gate-password-wrap">
            <input
              className="field auth-gate-field w-full"
              type="password"
              placeholder="Password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {mode === "signin" ? (
              <button
                type="button"
                className="auth-gate-forgot"
                disabled={busy}
                onClick={() => void onForgotPassword()}
              >
                Forgot Password?
              </button>
            ) : null}
          </div>
          {message ? <p className="auth-gate-message">{message}</p> : null}
          <button type="submit" className="auth-gate-submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign In" : "Sign Up"}
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
}

export function NotesAuthGate({ onAuthed, variant = "notes" }: Props) {
  const [showModal, setShowModal] = useState(false);

  const INLINE_TITLE: Record<NonNullable<Props["variant"]>, string> = {
    notes: "Sign in to manage your notes.",
    "cookie-auto": "Sign in to enable cloud-first cookie sync.",
    twofa: "Sign in to manage 2FA codes.",
    system: "Sign in to access system tools.",
  };

  return (
    <>
      <div className="auth-inline anim-fade">
        <div className="auth-inline-card">
          <div className="auth-inline-title">{INLINE_TITLE[variant]}</div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="auth-inline-btn" onClick={() => setShowModal(true)}>
              Sign in
            </button>
            <button
              type="button"
              className="auth-inline-btn auth-inline-btn--ghost"
              onClick={() => {
                setOfflineMode(true);
                onAuthed?.();
              }}
              title="Use offline mode (limited features)"
            >
              Offline mode
            </button>
          </div>
        </div>
      </div>
      {showModal ? (
        <AuthGateModal
          onAuthed={() => {
            setShowModal(false);
            onAuthed?.();
          }}
          onClose={() => setShowModal(false)}
        />
      ) : null}
    </>
  );
}
