import { memo, useEffect, useMemo, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import type { TwofaAccount } from "./types";
import { generateCode, normalizeSecret } from "./totp";
import { readTwofaMaskPasswordInTable, TWOFA_TABLE_DISPLAY_CHANGE_EVENT } from "./twofa-table-display-prefs";

const CODE_CHIP_CLASS =
  "twofa-code-badge inline-flex max-w-none items-center gap-1.5 rounded-full border border-amber-400/55 bg-amber-500/24 px-2 py-0.5 font-mono text-[11px] font-semibold leading-[1.3] tracking-[0.12em] text-amber-50 shadow-[0_0_10px_rgba(251,191,36,0.2)]";

function maskLabel(value: string): string {
  const len = Math.min(8, Math.max(4, value.length));
  return "•".repeat(len);
}

function useCopyFlash() {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1400);
    return () => window.clearTimeout(timer);
  }, [copied]);
  return { copied, flash: () => setCopied(true) };
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
      {copied ? <Check size={10} className="twofa-copy-control__tick shrink-0 text-emerald-400" aria-hidden /> : null}
    </button>
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

export const TwofaCodeCell = memo(function TwofaCodeCell({
  account,
  tick,
  onUsed,
}: {
  account: TwofaAccount;
  tick: number;
  onUsed: (id: string) => void;
}) {
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
        {copied ? <Check size={10} className="shrink-0 text-emerald-300" aria-hidden /> : null}
      </button>
    </div>
  );
});
