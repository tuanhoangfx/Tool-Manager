import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, ExternalLink, Loader2, Monitor } from "lucide-react";
import {
  HubAddModalTocNav,
  HubToolDetailModal,
  HubToolDetailModalPrimaryAction,
  HubToolDetailModalSecondaryAction,
  HubToolDetailSection,
  HubToolDetailSections,
  HUB_TOOL_DETAIL_SCROLL_ROOT,
} from "@tool-workspace/hub-ui";
import type { CockpitImportOutcome } from "./quota-api";
import { isQuotaProbeApiLikelyAvailable } from "./quota-api";
import {
  cancelStealthQuotaEnroll,
  pollStealthQuotaEnroll,
  startStealthQuotaEnroll,
  type QuotaOAuthPlatform,
} from "./quota-stealth-enroll-api";
import "./quota-enroll-modal.css";

type Props = {
  open: boolean;
  onClose: () => void;
  onEnrolled: (outcome: CockpitImportOutcome) => void;
};

const PLATFORM_TABS = [
  { id: "cursor" as const, label: "Cursor" },
  { id: "gemini" as const, label: "Gemini" },
];

const STEALTH_PROFILES = ["0012", "0021", "0069"] as const;

const PLATFORM_HINT: Record<QuotaOAuthPlatform, string> = {
  cursor: "Cockpit PKCE OAuth — opened in P0003 Stealth profile. Login if prompted, then quota syncs.",
  gemini: "Google OAuth (Cockpit) — opened in P0003 Stealth. Approve access; localhost callback handles the rest.",
};

export function QuotaEnrollModal({ open, onClose, onEnrolled }: Props) {
  const [platform, setPlatform] = useState<QuotaOAuthPlatform>("cursor");
  const [profileName, setProfileName] = useState<string>(STEALTH_PROFILES[2]);
  const [oauthUrl, setOauthUrl] = useState("");
  const [callbackUrl, setCallbackUrl] = useState<string | null>(null);
  const [loginId, setLoginId] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState<number | null>(null);
  const [launching, setLaunching] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlCopied, setUrlCopied] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionRef = useRef<{ platform: QuotaOAuthPlatform; loginId: string } | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setPolling(false);
  }, []);

  const reset = useCallback(() => {
    stopPolling();
    const session = sessionRef.current;
    if (session) {
      void cancelStealthQuotaEnroll(session.platform, session.loginId).catch(() => {});
    }
    sessionRef.current = null;
    setOauthUrl("");
    setCallbackUrl(null);
    setLoginId(null);
    setExpiresIn(null);
    setLaunching(false);
    setError(null);
    setUrlCopied(false);
    setPlatform("cursor");
    setProfileName(STEALTH_PROFILES[2]);
  }, [stopPolling]);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const runPollOnce = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) return;
    try {
      const outcome = await pollStealthQuotaEnroll(session.platform, session.loginId);
      if (outcome === "pending") return;
      stopPolling();
      sessionRef.current = null;
      onEnrolled(outcome);
      onClose();
    } catch (err) {
      stopPolling();
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [onClose, onEnrolled, stopPolling]);

  const startPolling = useCallback(() => {
    stopPolling();
    setPolling(true);
    void runPollOnce();
    pollTimerRef.current = setInterval(() => void runPollOnce(), 2500);
  }, [runPollOnce, stopPolling]);

  const launchStealth = useCallback(async () => {
    if (!isQuotaProbeApiLikelyAvailable()) {
      setError("Requires dev server (pnpm dev) with quota + P0003 Stealth API.");
      return;
    }
    stopPolling();
    const prev = sessionRef.current;
    if (prev) await cancelStealthQuotaEnroll(prev.platform, prev.loginId).catch(() => {});
    sessionRef.current = null;

    setLaunching(true);
    setError(null);
    setOauthUrl("");
    try {
      const start = await startStealthQuotaEnroll(platform, profileName);
      sessionRef.current = { platform: start.platform, loginId: start.loginId };
      setLoginId(start.loginId);
      setOauthUrl(start.verificationUri);
      setCallbackUrl(start.callbackUrl ?? null);
      setExpiresIn(start.expiresIn);
      setLaunching(false);
      startPolling();
    } catch (err) {
      setLaunching(false);
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [platform, profileName, startPolling, stopPolling]);

  useEffect(() => {
    if (!open) return;
    void launchStealth();
  }, [open, platform, profileName]); // eslint-disable-line react-hooks/exhaustive-deps -- relaunch when platform/profile changes

  const copyUrl = async () => {
    if (!oauthUrl) return;
    await navigator.clipboard.writeText(oauthUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  if (!open) return null;

  const busy = launching || polling;

  return (
    <HubToolDetailModal
      open
      onClose={busy ? () => {} : onClose}
      title="Enroll subscription"
      titleId="quota-enroll-title"
      headerIcon={Monitor}
      headerIconClassName="text-violet-300"
      shellClassName="hub-add-modal quota-enroll-modal"
      size="detail"
      sectionIds={["quota-stealth"]}
      scrollRootSelector={HUB_TOOL_DETAIL_SCROLL_ROOT}
      toc={
        <HubAddModalTocNav
          tabs={PLATFORM_TABS}
          activeTab={platform}
          onTabChange={(tab) => setPlatform(tab as QuotaOAuthPlatform)}
          sectionIdPrefix="quota-"
          scrollRootSelector={HUB_TOOL_DETAIL_SCROLL_ROOT}
        />
      }
      footer={
        <>
          <HubToolDetailModalSecondaryAction label="Cancel" disabled={launching} onClick={onClose} />
          <HubToolDetailModalPrimaryAction
            label={launching ? "Launching…" : "Relaunch Stealth"}
            disabled={launching}
            busy={launching}
            onClick={() => void launchStealth()}
          />
        </>
      }
    >
      <div className="hub-add-modal__main quota-enroll-main">
        <HubToolDetailSections>
          <HubToolDetailSection id="quota-stealth" title="Stealth OAuth (P0003)" icon={<Monitor size={14} aria-hidden />}>
            <p className="quota-enroll-desc">{PLATFORM_HINT[platform]}</p>

            <label className="quota-stealth-profile-label">
              Stealth profile
              <select
                className="quota-stealth-profile-select"
                value={profileName}
                disabled={busy}
                onChange={(e) => setProfileName(e.target.value)}
              >
                {STEALTH_PROFILES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>

            {error ? (
              <div className="quota-oauth-error">
                <span>{error}</span>
                <button type="button" className="btn text-[11px]" onClick={() => void launchStealth()}>
                  Retry
                </button>
              </div>
            ) : null}

            {launching ? (
              <div className="quota-oauth-waiting">
                <Loader2 size={14} className="animate-spin" />
                <span>Starting P0003 + opening OAuth in profile {profileName}…</span>
              </div>
            ) : null}

            {oauthUrl ? (
              <div className="quota-oauth-url-section">
                <p className="quota-oauth-hint">
                  Stealth profile <strong>{profileName}</strong> opened
                  {expiresIn != null ? ` · session ${expiresIn}s` : ""}
                </p>
                <div className="quota-oauth-url-box">
                  <input type="text" value={oauthUrl} readOnly aria-label="OAuth URL" />
                  <button type="button" className="btn icon-only" onClick={() => void copyUrl()} title="Copy URL">
                    {urlCopied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
                <a
                  className="btn btn-primary inline-flex gap-2 text-[12px]"
                  href={oauthUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={14} />
                  Open OAuth URL
                </a>
                {callbackUrl ? <p className="quota-oauth-hint">Gemini callback: {callbackUrl}</p> : null}
                {polling ? (
                  <div className="quota-oauth-waiting">
                    <Loader2 size={14} className="animate-spin" />
                    <span>Waiting for login in Stealth profile {profileName}…</span>
                  </div>
                ) : null}
                {loginId ? <p className="quota-oauth-hint">Login ID: {loginId.slice(0, 8)}…</p> : null}
              </div>
            ) : null}
          </HubToolDetailSection>
        </HubToolDetailSections>
      </div>
    </HubToolDetailModal>
  );
}
