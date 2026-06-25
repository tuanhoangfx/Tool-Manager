import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eye, EyeOff, KeyRound, Save, ScrollText, StickyNote, User } from "lucide-react";
import {
  HubCopyBadge,
  HubSingleFilterDropdown,
  HubTableColumnHeader,
  HubToolDetailModal,
  HubToolDetailModalPrimaryAction,
  HubToolDetailModalSecondaryAction,
  HubTocSectionNav,
  HUB_TOOL_DETAIL_SCROLL_ROOT,
} from "@tool-workspace/hub-ui";
import { TwofaCodeCell, TwofaPeriodCell } from "./twofa-copy-cells";
import {
  TWOFA_ADM_CONTROL_CLASS,
  TwofaDetailInlineField,
  TwofaDetailInlineReadonly,
  TwofaDetailInlineReadonlyCustom,
} from "./TwofaDetailField";
import { TWOFA_VAULT_ID_HEADER, twofaColumnHeaderProps, twofaColumnLabel } from "./twofa-column-meta";
import { TwofaLogEntryBody } from "./TwofaLogEntryBody";
import { TwofaRelativeTime } from "./TwofaRelativeTime";
import {
  DEFAULT_TWOFA_ACCOUNT_STATUS,
  twofaStatusFilterOptions,
  type TwofaAccountStatus,
} from "./twofa-account-status";
import {
  DEFAULT_TWOFA_ACCOUNT_OWNERSHIP,
  twofaOwnershipFilterOptions,
  type TwofaAccountOwnership,
} from "./twofa-account-ownership";
import {
  TWOFA_ACCOUNT_DETAIL_SECTION_CREDENTIALS,
  TWOFA_ACCOUNT_DETAIL_SECTION_LOG,
  TWOFA_ACCOUNT_DETAIL_TOC,
} from "./twofa-account-detail-toc";
import { isBrowserCode, normalizeBrowserCode } from "./twofa-browser-code";
import { generateCode, normalizeSecret } from "./totp";
import type { TwofaAccount, TwofaDraft } from "./types";
import { twofaDraftHasContent } from "./twofa-upsert-accounts";
import { useTwofaRelativeNow, fmtHubDate, fmtHubRelativeTime } from "./twofa-time";
import { useTwofaShowPasswordInTable } from "./useTwofaShowPasswordInTable";
import { TwofaNoteSearchField } from "./TwofaNoteSearchField";
import "./twofa-inline-fields.css";
import "./twofa-account-detail-modal.css";

type Props = {
  account: TwofaAccount;
  onClose: () => void;
  onSave: (draft: TwofaDraft) => "ok" | "conflict" | "fail";
  onCodeUsed: () => void;
};

export function TwofaAccountDetailModal({ account, onClose, onSave, onCodeUsed }: Props) {
  const relativeNow = useTwofaRelativeNow();
  const showPasswordPref = useTwofaShowPasswordInTable();
  const [revealPassword, setRevealPassword] = useState(showPasswordPref);
  const [service, setService] = useState(() => account.service);
  const [browser, setBrowser] = useState(() => account.browser ?? "");
  const [accountId, setAccountId] = useState(() => account.account);
  const [mailRecover, setMailRecover] = useState(() => account.mailRecover ?? "");
  const [password, setPassword] = useState(() => account.password ?? "");
  const [secret, setSecret] = useState(() => account.secret ?? "");
  const [note, setNote] = useState(() => account.note ?? "");
  const [status, setStatus] = useState<TwofaAccountStatus>(
    () => account.status ?? DEFAULT_TWOFA_ACCOUNT_STATUS,
  );
  const [ownership, setOwnership] = useState<TwofaAccountOwnership>(
    () => account.ownership ?? DEFAULT_TWOFA_ACCOUNT_OWNERSHIP,
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const accountRowIdRef = useRef<string | null>(null);

  const draft = useMemo(
    (): TwofaDraft => ({
      service,
      browser: browser.trim() ? normalizeBrowserCode(browser.trim()) : undefined,
      account: accountId,
      mailRecover: mailRecover.trim() || undefined,
      password: password.trim() || undefined,
      secret,
      note: note.trim() || undefined,
      status,
      ownership,
    }),
    [accountId, browser, mailRecover, note, ownership, password, secret, service, status],
  );

  const dirty = useMemo(() => {
    const browserNorm = browser.trim() ? normalizeBrowserCode(browser.trim()) : undefined;
    return (
      service !== account.service ||
      browserNorm !== (account.browser?.trim() || undefined) ||
      accountId !== account.account ||
      (mailRecover.trim() || undefined) !== (account.mailRecover?.trim() || undefined) ||
      (password.trim() || undefined) !== (account.password?.trim() || undefined) ||
      secret !== account.secret ||
      (note.trim() || undefined) !== (account.note?.trim() || undefined) ||
      status !== account.status ||
      ownership !== account.ownership
    );
  }, [account, accountId, browser, mailRecover, note, ownership, password, secret, service, status]);

  useEffect(() => {
    const rowChanged = accountRowIdRef.current !== account.id;
    accountRowIdRef.current = account.id;
    if (!rowChanged && dirty) return;
    setService(account.service);
    setBrowser(account.browser ?? "");
    setAccountId(account.account);
    setMailRecover(account.mailRecover ?? "");
    setPassword(account.password ?? "");
    setSecret(account.secret);
    setNote(account.note ?? "");
    setStatus(account.status ?? DEFAULT_TWOFA_ACCOUNT_STATUS);
    setOwnership(account.ownership ?? DEFAULT_TWOFA_ACCOUNT_OWNERSHIP);
    setError(null);
    setBusy(false);
  }, [account, dirty]);

  useEffect(() => {
    setRevealPassword(showPasswordPref);
  }, [account.id, showPasswordPref]);

  const passwordVisible = revealPassword;

  const liveAccount = useMemo(
    (): TwofaAccount => ({
      ...account,
      service: draft.service,
      browser: draft.browser,
      account: draft.account,
      mailRecover: draft.mailRecover,
      password: draft.password,
      secret: draft.secret,
      note: draft.note,
      status: draft.status ?? DEFAULT_TWOFA_ACCOUNT_STATUS,
      ownership: draft.ownership ?? DEFAULT_TWOFA_ACCOUNT_OWNERSHIP,
    }),
    [account, draft],
  );

  const liveHasTotpSecret = useMemo(
    () => Boolean(normalizeSecret(liveAccount.secret)),
    [liveAccount.secret],
  );

  const sectionIds = useMemo(
    () => [TWOFA_ACCOUNT_DETAIL_SECTION_CREDENTIALS, TWOFA_ACCOUNT_DETAIL_SECTION_LOG],
    [],
  );

  const logEntries = useMemo(
    () => (account.log?.length ? [...account.log].reverse() : []),
    [account.log],
  );

  const title = account.service.trim() || account.account.trim() || "Account";

  const handleSave = useCallback(() => {
    setError(null);
    const browserRaw = browser.trim();
    if (browserRaw && !isBrowserCode(browserRaw)) {
      setError("Browser code must be 4 digits (e.g. 0100).");
      return;
    }
    if (!twofaDraftHasContent(draft)) {
      setError("Add at least service, browser, account, password, note, or secret.");
      return;
    }
    if (secret.trim() && !generateCode(draft.service, draft.account, draft.secret)) {
      setError("Invalid Base32 secret.");
      return;
    }
    setBusy(true);
    const result = onSave(draft);
    setBusy(false);
    if (result === "ok") {
      setError(null);
      return;
    }
    if (result === "conflict") {
      setError("Another account already uses this identity. Resolve the conflict from the directory.");
      return;
    }
    setError("Could not save changes.");
  }, [browser, draft, onSave, secret]);

  return (
    <HubToolDetailModal
      open
      onClose={onClose}
      title={title}
      titleId="twofa-account-detail-title"
      headerIcon={KeyRound}
      headerIconClassName="text-indigo-300"
      shellClassName="hub-header-panel-modal twofa-account-detail-modal"
      sectionIds={sectionIds}
      scrollRootSelector={HUB_TOOL_DETAIL_SCROLL_ROOT}
      toc={
        <nav className="twofa-adm-rail twofa-adm-rail--toc" aria-label="Sections">
          <div className="twofa-adm-rail__head">Navigate</div>
          <div className="twofa-adm-rail__body">
            <HubTocSectionNav
              items={[...TWOFA_ACCOUNT_DETAIL_TOC]}
              scrollRootSelector={HUB_TOOL_DETAIL_SCROLL_ROOT}
            />
          </div>
        </nav>
      }
      footer={
        <>
          <HubToolDetailModalSecondaryAction label="Close" onClick={onClose} disabled={busy} />
          <HubToolDetailModalPrimaryAction
            label={busy ? "Saving…" : "Save changes"}
            icon={Save}
            onClick={handleSave}
            disabled={busy || !dirty}
            busy={busy}
          />
        </>
      }
      ariaLabelledBy="twofa-account-detail-title"
    >
      <div className="twofa-account-detail__body">
        <div className="twofa-account-detail__split">
          <section
            id={TWOFA_ACCOUNT_DETAIL_SECTION_CREDENTIALS}
            className="twofa-adm-panel twofa-account-detail__panel"
            aria-label="Credentials"
          >
            <div className="twofa-adm-panel__head">
              <User size={12} aria-hidden />
              Credentials
            </div>
            <div className="twofa-adm-panel__body">
              <div className="twofa-adm-hero">
                <div className="twofa-adm-hero__meta">
                  <div className="twofa-adm-hero__status">
                    <span className="twofa-adm-inline-field__label hub-users-th-label hub-users-th-label--start">
                      <HubTableColumnHeader {...twofaColumnHeaderProps("status")} />
                    </span>
                    <HubSingleFilterDropdown
                      filterKey="twofa-detail-status"
                      label={twofaColumnLabel("status")}
                      options={twofaStatusFilterOptions()}
                      value={status}
                      onChange={(value) => setStatus(value as TwofaAccountStatus)}
                      triggerFormat="value"
                      className="twofa-adm-hero__status-wrap"
                      triggerClassName="twofa-adm-hero__status-trigger"
                    />
                  </div>
                  <div className="twofa-adm-hero__status">
                    <span className="twofa-adm-inline-field__label hub-users-th-label hub-users-th-label--start">
                      <HubTableColumnHeader {...twofaColumnHeaderProps("ownership")} />
                    </span>
                    <HubSingleFilterDropdown
                      filterKey="twofa-detail-ownership"
                      label={twofaColumnLabel("ownership")}
                      options={twofaOwnershipFilterOptions()}
                      value={ownership}
                      onChange={(value) => setOwnership(value as TwofaAccountOwnership)}
                      triggerFormat="value"
                      className="twofa-adm-hero__status-wrap"
                      triggerClassName="twofa-adm-hero__status-trigger"
                    />
                  </div>
                </div>
                <div className="twofa-adm-hero__code">
                  <span className="twofa-adm-muted">{twofaColumnLabel("code")}</span>
                  <TwofaCodeCell account={liveAccount} onUsed={onCodeUsed} />
                  {liveHasTotpSecret ? (
                    <>
                      <span className="twofa-adm-muted">{twofaColumnLabel("period")}</span>
                      <TwofaPeriodCell />
                    </>
                  ) : null}
                </div>
              </div>

              <div className="twofa-adm-form-rows">
                <div className="twofa-adm-form-row twofa-adm-form-row--3 twofa-adm-form-row--aligned">
                  <TwofaDetailInlineField columnKey="service">
                    <input
                      className={TWOFA_ADM_CONTROL_CLASS}
                      name="twofa-detail-service"
                      autoComplete="off"
                      value={service}
                      onChange={(e) => setService(e.target.value)}
                    />
                  </TwofaDetailInlineField>

                  <TwofaDetailInlineField columnKey="browser">
                    <input
                      className={`${TWOFA_ADM_CONTROL_CLASS} font-mono`}
                      name="twofa-detail-browser"
                      autoComplete="off"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="0100"
                      value={browser}
                      onChange={(e) => setBrowser(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    />
                  </TwofaDetailInlineField>

                  <TwofaDetailInlineField columnKey="mailRecover">
                    <input
                      className={TWOFA_ADM_CONTROL_CLASS}
                      name="twofa-detail-mail-recover"
                      autoComplete="off"
                      placeholder="Recovery mailbox"
                      value={mailRecover}
                      onChange={(e) => setMailRecover(e.target.value)}
                    />
                  </TwofaDetailInlineField>
                </div>

                <div className="twofa-adm-form-row twofa-adm-form-row--3 twofa-adm-form-row--aligned twofa-adm-form-row--credentials">
                  <TwofaDetailInlineField columnKey="account">
                    <input
                      className={TWOFA_ADM_CONTROL_CLASS}
                      name="twofa-detail-account"
                      autoComplete="off"
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                    />
                  </TwofaDetailInlineField>

                  <TwofaDetailInlineField columnKey="password">
                    <div className="twofa-adm-password-field">
                      <input
                        className={`${TWOFA_ADM_CONTROL_CLASS} font-mono${passwordVisible ? "" : " twofa-add-field-masked"}`}
                        name="twofa-detail-password"
                        type="text"
                        autoComplete="off"
                        data-lpignore="true"
                        data-1p-ignore
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="twofa-adm-password-reveal"
                        aria-label={passwordVisible ? "Hide password" : "Show password"}
                        title={passwordVisible ? "Hide password" : "Show password"}
                        onClick={() => setRevealPassword((v) => !v)}
                      >
                        {passwordVisible ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />}
                      </button>
                    </div>
                  </TwofaDetailInlineField>

                  <TwofaDetailInlineField columnKey="secret">
                    <input
                      className={`${TWOFA_ADM_CONTROL_CLASS} font-mono`}
                      name="twofa-detail-secret"
                      autoComplete="off"
                      placeholder="Base32 — optional"
                      value={secret}
                      onChange={(e) => setSecret(e.target.value)}
                    />
                  </TwofaDetailInlineField>
                </div>
              </div>

              <div className="twofa-adm-form-row twofa-adm-form-row--3 twofa-adm-form-row--aligned twofa-adm-meta-row">
                <TwofaDetailInlineReadonly columnKey="created">
                  <time dateTime={account.createdAt} title={fmtHubDate(account.createdAt)}>
                    {fmtHubRelativeTime(account.createdAt, relativeNow)}
                  </time>
                </TwofaDetailInlineReadonly>
                <TwofaDetailInlineReadonly columnKey="updated">
                  <time dateTime={account.updatedAt} title={fmtHubDate(account.updatedAt)}>
                    {fmtHubRelativeTime(account.updatedAt, relativeNow)}
                  </time>
                </TwofaDetailInlineReadonly>
                <TwofaDetailInlineReadonlyCustom header={TWOFA_VAULT_ID_HEADER}>
                  <HubCopyBadge value={account.id} title="Copy vault row ID" className="font-mono text-[10px]" />
                </TwofaDetailInlineReadonlyCustom>
              </div>

              {error ? <p className="auth-gate-message mt-3">{error}</p> : null}
            </div>
          </section>

          <div className="twofa-account-detail__rail">
            <section className="twofa-adm-rail twofa-adm-rail--note" aria-label="Note">
              <div className="twofa-adm-rail__head">
                <StickyNote size={12} aria-hidden />
                {twofaColumnLabel("note")}
              </div>
              <div className="twofa-adm-rail__body twofa-adm-rail__body--note">
                <TwofaNoteSearchField value={note} onChange={setNote} />
              </div>
            </section>

            <aside
              id={TWOFA_ACCOUNT_DETAIL_SECTION_LOG}
              className="twofa-adm-rail twofa-adm-rail--log"
              aria-label="Change log"
            >
            <div className="twofa-adm-rail__head">
              <ScrollText size={12} aria-hidden />
              Change log
            </div>
            <div className="twofa-adm-rail__body twofa-adm-rail__body--scroll">
              {logEntries.length ? (
                <ol className="twofa-adm-log-list twofa-adm-log-list--dots">
                  {logEntries.map((entry, index) => (
                    <li
                      key={`${entry.at}-${index}`}
                      className="twofa-adm-log-item twofa-adm-log-item--dot"
                    >
                      <span
                        className={`twofa-adm-log-dot twofa-adm-log-dot--${index % 3}`}
                        aria-hidden
                      />
                      <div>
                        <time
                          className="twofa-adm-log-item__time"
                          dateTime={entry.at}
                          title={fmtHubDate(entry.at)}
                        >
                          {fmtHubRelativeTime(entry.at, relativeNow)}
                        </time>
                        <TwofaLogEntryBody entry={entry} />
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="twofa-adm-muted">No changes recorded yet.</p>
              )}
            </div>
          </aside>
          </div>
        </div>
      </div>
    </HubToolDetailModal>
  );
}
