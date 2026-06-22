import { useEffect, useMemo, useState } from "react";
import { KeyRound } from "lucide-react";
import {
  HubAddModalTocNav,
  HubSingleFilterDropdown,
  HubToolDetailModal,
  HubToolDetailModalPrimaryAction,
  HubToolDetailModalSecondaryAction,
  HubToolDetailSection,
  HUB_TOOL_DETAIL_SCROLL_ROOT,
} from "@tool-workspace/hub-ui";
import { generateCode } from "./totp";
import type { TwofaDraft } from "./types";
import {
  getTwofaBulkLineStatuses,
  parseTwofaBulkText,
  summarizeTwofaBulkLineStatuses,
  validateTwofaBulkRows,
} from "./parse-twofa-bulk";
import { isBrowserCode, normalizeBrowserCode } from "./twofa-browser-code";
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
import { TWOFA_ADD_TABS, twofaBulkSectionTitle } from "./twofa-add-toc";
import { twofaDraftHasContent } from "./twofa-upsert-accounts";
import { twofaColumnLabel } from "./twofa-column-meta";
import { TWOFA_ADM_CONTROL_CLASS, TwofaDetailInlineField } from "./TwofaDetailField";
import type { TwofaAddManyResult } from "./useTwofaAccounts";
import { TwofaBulkInputFrame } from "./TwofaBulkInputFrame";
import { TwofaBulkSectionSummary } from "./TwofaBulkSectionSummary";
import "./twofa-inline-fields.css";
import "./twofa-add-form.css";

type Tab = "single" | "bulk";

const TWOFA_ID_PREFIX = "twofa-";

export type TwofaAddFormProps = {
  active: boolean;
  initialDraft?: Partial<TwofaDraft> | null;
  /** When opened from search-with-no-match, customizes title. */
  searchQuery?: string;
  onClose: () => void;
  onSaveSingle: (draft: TwofaDraft) => "ok" | "conflict" | "fail";
  onImportMany: (drafts: TwofaDraft[]) => TwofaAddManyResult;
};

export function TwofaAddForm({
  active,
  initialDraft,
  searchQuery,
  onClose,
  onSaveSingle,
  onImportMany,
}: TwofaAddFormProps) {
  const [tab, setTab] = useState<Tab>("single");
  const [service, setService] = useState("");
  const [browser, setBrowser] = useState("");
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [secret, setSecret] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<TwofaAccountStatus>(DEFAULT_TWOFA_ACCOUNT_STATUS);
  const [ownership, setOwnership] = useState<TwofaAccountOwnership>(DEFAULT_TWOFA_ACCOUNT_OWNERSHIP);
  const [bulkText, setBulkText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!active) return;
    setError(null);
    setTab("single");
    setService(initialDraft?.service ?? "");
    setBrowser(initialDraft?.browser ?? "");
    setAccount(initialDraft?.account ?? "");
    setPassword(initialDraft?.password ?? "");
    setSecret(initialDraft?.secret ?? "");
    setNote(initialDraft?.note ?? "");
    setStatus(initialDraft?.status ?? DEFAULT_TWOFA_ACCOUNT_STATUS);
    setOwnership(initialDraft?.ownership ?? DEFAULT_TWOFA_ACCOUNT_OWNERSHIP);
    setBulkText("");
  }, [
    active,
    initialDraft?.service,
    initialDraft?.browser,
    initialDraft?.account,
    initialDraft?.password,
    initialDraft?.secret,
    initialDraft?.note,
    initialDraft?.status,
    initialDraft?.ownership,
  ]);

  const parsed = useMemo(() => parseTwofaBulkText(bulkText), [bulkText]);
  const bulkSummary = useMemo(
    () => summarizeTwofaBulkLineStatuses(getTwofaBulkLineStatuses(bulkText)),
    [bulkText],
  );
  const previewCount = useMemo(
    () => validateTwofaBulkRows(parsed.rows).valid.length,
    [parsed.rows],
  );
  const canTryBulkImport = Boolean(bulkText.trim());

  const sectionIds = useMemo(() => {
    if (tab === "single") return [`${TWOFA_ID_PREFIX}single`];
    return [`${TWOFA_ID_PREFIX}bulk-input`];
  }, [tab]);

  if (!active) return null;

  const onSubmitSingle = () => {
    const browserRaw = browser.trim();
    if (browserRaw && !isBrowserCode(browserRaw)) {
      setError("Browser code must be 4 digits (e.g. 0100).");
      return;
    }
    const draft = {
      service,
      browser: browserRaw ? normalizeBrowserCode(browserRaw) : undefined,
      account,
      password: password.trim() || undefined,
      secret,
      note: note.trim() || undefined,
      status,
      ownership,
    };
    if (!twofaDraftHasContent(draft)) {
      setError(`Add at least ${twofaColumnLabel("service").toLowerCase()}, browser, account, password, note, or secret.`);
      return;
    }
    if (secret.trim() && !generateCode(draft.service, draft.account, draft.secret)) {
      setError("Invalid Base32 secret.");
      return;
    }
    const result = onSaveSingle(draft);
    if (result === "fail") {
      setError("Could not save entry.");
      return;
    }
    if (result === "conflict") return;
    onClose();
  };

  const onImportBulk = () => {
    setBusy(true);
    setError(null);
    try {
      const result = bulkText.trim()
        ? parsed
        : { rows: [], errors: [{ line: 0, message: "Paste at least one row." }] };
      const { valid, invalid } = validateTwofaBulkRows(result.rows);
      const allErrors = [...result.errors, ...invalid];
      if (!valid.length) {
        setError(allErrors[0]?.message ?? "No valid rows to import.");
        return;
      }
      const { added, replaced, total } = onImportMany(valid);
      const importSummary =
        replaced > 0
          ? `Imported ${total} (${added} new, ${replaced} replaced).`
          : `Imported ${total}.`;
      if (allErrors.length) {
        setError(`${importSummary} Skipped ${allErrors.length} line(s).`);
        if (total > 0) onClose();
        return;
      }
      if (total > 0) onClose();
    } finally {
      setBusy(false);
    }
  };

  const title = searchQuery?.trim() ? "Add account" : "Add accounts";

  const singleFields = (
    <div className="twofa-adm-form-rows">
      <div className="twofa-adm-form-row twofa-adm-form-row--3">
        <TwofaDetailInlineField columnKey="service">
          <input
            className={TWOFA_ADM_CONTROL_CLASS}
            name="twofa-service"
            autoComplete="off"
            placeholder="Optional"
            value={service}
            onChange={(e) => setService(e.target.value)}
          />
        </TwofaDetailInlineField>
        <TwofaDetailInlineField columnKey="browser">
          <input
            className={`${TWOFA_ADM_CONTROL_CLASS} font-mono`}
            name="twofa-browser"
            autoComplete="off"
            inputMode="numeric"
            placeholder="0100"
            maxLength={4}
            value={browser}
            onChange={(e) => setBrowser(e.target.value.replace(/\D/g, "").slice(0, 4))}
          />
        </TwofaDetailInlineField>
        <TwofaDetailInlineField columnKey="account">
          <input
            className={TWOFA_ADM_CONTROL_CLASS}
            name="twofa-account-id"
            autoComplete="off"
            placeholder="Optional"
            value={account}
            readOnly
            onFocus={(e) => {
              e.currentTarget.readOnly = false;
            }}
            onChange={(e) => setAccount(e.target.value)}
          />
        </TwofaDetailInlineField>
      </div>
      <div className="twofa-adm-form-row twofa-adm-form-row--3">
        <TwofaDetailInlineField columnKey="password">
          <input
            className={`${TWOFA_ADM_CONTROL_CLASS} twofa-add-field-masked font-mono`}
            name="twofa-stored-password"
            type="text"
            autoComplete="off"
            data-lpignore="true"
            data-1p-ignore
            placeholder="Optional"
            value={password}
            readOnly
            onFocus={(e) => {
              e.currentTarget.readOnly = false;
            }}
            onChange={(e) => setPassword(e.target.value)}
          />
        </TwofaDetailInlineField>
        <TwofaDetailInlineField columnKey="secret">
          <input
            className={`${TWOFA_ADM_CONTROL_CLASS} font-mono`}
            name="twofa-totp-secret"
            autoComplete="off"
            placeholder="Base32 — optional"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
          />
        </TwofaDetailInlineField>
        <TwofaDetailInlineField columnKey="note">
          <input
            className={TWOFA_ADM_CONTROL_CLASS}
            name="twofa-note"
            autoComplete="off"
            placeholder="Optional"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </TwofaDetailInlineField>
      </div>
      <div className="twofa-adm-form-row twofa-adm-form-row--2">
        <TwofaDetailInlineField columnKey="status">
          <HubSingleFilterDropdown
            filterKey="twofa-add-status"
            label={twofaColumnLabel("status")}
            options={twofaStatusFilterOptions()}
            value={status}
            onChange={(value) => setStatus(value as TwofaAccountStatus)}
            triggerFormat="value"
            className="w-full min-w-0"
            triggerClassName={`${TWOFA_ADM_CONTROL_CLASS} !w-full`}
          />
        </TwofaDetailInlineField>
        <TwofaDetailInlineField columnKey="ownership">
          <HubSingleFilterDropdown
            filterKey="twofa-add-ownership"
            label={twofaColumnLabel("ownership")}
            options={twofaOwnershipFilterOptions()}
            value={ownership}
            onChange={(value) => setOwnership(value as TwofaAccountOwnership)}
            triggerFormat="value"
            className="w-full min-w-0"
            triggerClassName={`${TWOFA_ADM_CONTROL_CLASS} !w-full`}
          />
        </TwofaDetailInlineField>
      </div>
    </div>
  );

  const singlePanel = (
    <HubToolDetailSection id={`${TWOFA_ID_PREFIX}single`} title="Credentials">
      {singleFields}
    </HubToolDetailSection>
  );

  const bulkPanel = (
    <HubToolDetailSection
      id={`${TWOFA_ID_PREFIX}bulk-input`}
      className="twofa-bulk-input-section"
      title={twofaBulkSectionTitle("bulk-input")}
      headerActions={<TwofaBulkSectionSummary summary={bulkSummary} />}
    >
      <TwofaBulkInputFrame value={bulkText} disabled={busy} onChange={setBulkText} />
    </HubToolDetailSection>
  );

  const formBody = (
    <form
      className="auth-gate-form"
      autoComplete="off"
      onSubmit={(e) => e.preventDefault()}
      data-twofa-credential-form
    >
      <div className="hub-add-modal__panels">
        <div
          className={`hub-add-modal__panel${tab === "single" ? "" : " hub-add-modal__panel--hidden"}`}
        >
          {singlePanel}
        </div>
        <div
          className={`hub-add-modal__panel${tab === "bulk" ? "" : " hub-add-modal__panel--hidden"}`}
        >
          {bulkPanel}
        </div>
      </div>

      {error ? <p className="auth-gate-message">{error}</p> : null}
    </form>
  );

  const hubFooter = (
    <>
      <HubToolDetailModalSecondaryAction label="Cancel" onClick={onClose} disabled={busy} />
      {tab === "bulk" ? (
        <HubToolDetailModalPrimaryAction
          label={busy ? "Please wait…" : previewCount > 0 ? `Import (${previewCount})` : "Import"}
          onClick={onImportBulk}
          disabled={busy || !canTryBulkImport}
          busy={busy}
        />
      ) : (
        <HubToolDetailModalPrimaryAction
          label="Add account"
          onClick={onSubmitSingle}
          disabled={busy}
          busy={busy}
          icon={KeyRound}
        />
      )}
    </>
  );

  return (
    <HubToolDetailModal
      open={active}
      onClose={onClose}
      title={title}
      titleId="twofa-add-modal-title"
      headerIcon={KeyRound}
      headerIconClassName="text-indigo-300"
      shellClassName="hub-add-modal twofa-add-modal"
      size="detail"
      sectionIds={sectionIds}
      scrollRootSelector={HUB_TOOL_DETAIL_SCROLL_ROOT}
      toc={
        <HubAddModalTocNav
          tabs={TWOFA_ADD_TABS}
          activeTab={tab}
          onTabChange={setTab}
          sectionIdPrefix={TWOFA_ID_PREFIX}
          scrollRootSelector={HUB_TOOL_DETAIL_SCROLL_ROOT}
        />
      }
      footer={hubFooter}
    >
      <div className="hub-add-modal__main">{formBody}</div>
    </HubToolDetailModal>
  );
}
