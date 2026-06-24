import { memo, useEffect, useMemo, useState, type ReactNode } from "react";
import { HubCopyTickWrap, useHubCopyFlash } from "@tool-workspace/hub-ui";
import type { TwofaAccount } from "./types";
import { formatTwofaAccountStatus } from "./twofa-account-status";
import { formatTwofaAccountOwnership } from "./twofa-account-ownership";
import { latestTwofaLogEntry } from "./twofa-account-log";
import { generateCode, normalizeSecret, secondsRemaining } from "./totp";
import { useTwofaTotpTick } from "./twofa-totp-tick";
import { readTwofaMaskPasswordInTable, TWOFA_TABLE_DISPLAY_CHANGE_EVENT } from "./twofa-table-display-prefs";

const CODE_CHIP_CLASS =
  "twofa-code-badge inline-flex max-w-none items-center gap-1.5 rounded-full border border-amber-400/55 bg-amber-500/24 px-2 py-0.5 font-mono text-[11px] font-semibold leading-[1.3] tracking-[0.12em] text-amber-50 shadow-[0_0_10px_rgba(251,191,36,0.2)]";

function maskLabel(value: string): string {
  const len = Math.min(8, Math.max(4, value.length));
  return "•".repeat(len);
}

function useCopyFlash() {
  return useHubCopyFlash();
}

function useMaskPasswordPref() {
  const [mask, setMask] = useState(() => readTwofaMaskPasswordInTable());
  useEffect(() => {
    const sync = () => setMask(readTwofaMaskPasswordInTable());
    window.addEventListener(TWOFA_TABLE_DISPLAY_CHANGE_EVENT, sync);
    return () => window.removeEventListener(TWOFA_TABLE_DISPLAY_CHANGE_EVENT, sync);
  }, []);
  return mask;
}

function TwofaCopyControl({
  value,
  display,
  className,
  title,
  onCopied,
}: {
  value: string;
  display: ReactNode;
  className: string;
  title: string;
  onCopied?: () => void;
}) {
  const { copied, flash } = useCopyFlash();

  return (
    <HubCopyTickWrap copied={copied} className="twofa-copy-control-wrap">
      <button
        type="button"
        className={`twofa-copy-control ${className}`}
        title={title}
        onClick={(e) => {
          e.stopPropagation();
          void navigator.clipboard?.writeText(value).then(() => {
            flash();
            onCopied?.();
          });
        }}
      >
        <span className="twofa-copy-control__value min-w-0">{display}</span>
      </button>
    </HubCopyTickWrap>
  );
}

export function TwofaBrowserCell({ account }: { account: TwofaAccount }) {
  const value = account.browser?.trim();
  if (!value) return <span className="hub-users-cell-muted">—</span>;

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <TwofaCopyControl
        value={value}
        display={<span className="twofa-browser-badge tabular-nums">{value}</span>}
        className="twofa-copy-control--browser"
        title="Copy browser code"
      />
    </div>
  );
}

export function TwofaAccountCell({ account }: { account: TwofaAccount }) {
  const value = account.account.trim();
  if (!value) return <span className="hub-users-cell-muted">—</span>;

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <TwofaCopyControl
        value={value}
        display={value}
        className="twofa-copy-control--account hub-users-name-title"
        title="Copy account"
      />
    </div>
  );
}

export function TwofaSecretCell({ account }: { account: TwofaAccount }) {
  const value = normalizeSecret(account.secret);
  if (!value) return <span className="hub-users-cell-muted">—</span>;

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <TwofaCopyControl
        value={value}
        display={value}
        className="twofa-copy-control--secret"
        title="Copy secret"
      />
    </div>
  );
}

export function TwofaStatusCell({ account }: { account: TwofaAccount }) {
  const label = formatTwofaAccountStatus(account.status);
  return (
    <span className="line-clamp-1" title={label}>
      {label}
    </span>
  );
}

export function TwofaOwnershipCell({ account }: { account: TwofaAccount }) {
  const label = formatTwofaAccountOwnership(account.ownership);
  return (
    <span className="line-clamp-1" title={label}>
      {label}
    </span>
  );
}

export function TwofaMailRecoverCell({ account }: { account: TwofaAccount }) {
  const value = account.mailRecover?.trim();
  if (!value) return <span className="hub-users-cell-muted">—</span>;

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <TwofaCopyControl
        value={value}
        display={value}
        className="twofa-copy-control--account hub-users-name-title"
        title="Copy recovery mail"
      />
    </div>
  );
}

export function TwofaNoteCell({ account }: { account: TwofaAccount }) {
  const value = account.note?.trim();
  if (!value) return <span className="hub-users-cell-muted">—</span>;
  return (
    <span className="twofa-table-cell-ellipsis text-left" title={value}>
      {value.replace(/\s+/g, " ")}
    </span>
  );
}

export function TwofaLogCell({ account }: { account: TwofaAccount }) {
  const entry = latestTwofaLogEntry(account);
  if (!entry) return <span className="hub-users-cell-muted">—</span>;
  return (
    <span className="twofa-table-cell-ellipsis text-left" title={`${entry.message} · ${entry.at}`}>
      {entry.message}
    </span>
  );
}

export function TwofaPasswordCell({ account }: { account: TwofaAccount }) {
  const value = account.password?.trim();
  const mask = useMaskPasswordPref();
  if (!value) return <span className="hub-users-cell-muted">—</span>;

  const display = mask ? maskLabel(value) : value;

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <TwofaCopyControl
        value={value}
        display={display}
        className={`twofa-copy-control--password${mask ? " twofa-copy-control--password-masked" : ""}`}
        title="Copy password"
      />
    </div>
  );
}

function periodTone(secondsLeft: number): "fresh" | "warn" | "urgent" {
  if (secondsLeft > 20) return "fresh";
  if (secondsLeft > 10) return "warn";
  return "urgent";
}

export const TwofaPeriodCell = memo(function TwofaPeriodCell() {
  const tick = useTwofaTotpTick();
  void tick;
  const left = secondsRemaining();
  const tone = periodTone(left);
  return (
    <span className="hub-twofa-period-inline" title={`${left}s remaining`}>
      <span className={`hub-twofa-period-dot hub-twofa-period-dot--${tone}`} aria-hidden />
      <span className="hub-twofa-period-label tabular-nums">{left}s</span>
    </span>
  );
});

export const TwofaCodeCell = memo(function TwofaCodeCell({
  account,
  onUsed,
}: {
  account: TwofaAccount;
  onUsed: (id: string) => void;
}) {
  const tick = useTwofaTotpTick();
  const code = useMemo(
    () => generateCode(account.service, account.account, account.secret),
    [account.service, account.account, account.secret, tick],
  );
  const { copied, flash } = useCopyFlash();

  if (!code) {
    return <span className="hub-users-cell-muted">------</span>;
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <HubCopyTickWrap copied={copied} className="twofa-copy-control-wrap" tickClassName="text-emerald-300">
        <button
          type="button"
          className={CODE_CHIP_CLASS}
          title="Copy code"
          onClick={(e) => {
            e.stopPropagation();
            void navigator.clipboard?.writeText(code).then(() => {
              flash();
              onUsed(account.id);
            });
          }}
        >
          <span className="whitespace-nowrap">{code}</span>
        </button>
      </HubCopyTickWrap>
    </div>
  );
});
