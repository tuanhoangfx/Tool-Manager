import { useEffect, useMemo, useState } from "react";
import { Boxes, Globe, KeyRound, LockKeyhole, User } from "lucide-react";
import {
  HubAddModalTocNav,
  HubFormFieldLabel,
  HubToolDetailModal,
  HubToolDetailModalPrimaryAction,
  HubToolDetailModalSecondaryAction,
  HubToolDetailSection,
  HUB_TOOL_DETAIL_FORM_GRID_2_CLASS,
  HUB_TOOL_DETAIL_SCROLL_ROOT,
} from "@tool-workspace/hub-ui";
import { generateCode } from "./totp";
import type { TwofaAccount, TwofaDraft } from "./types";
import {
  getTwofaBulkLineStatuses,
  parseTwofaBulkText,
  summarizeTwofaBulkLineStatuses,
  validateTwofaBulkRows,
} from "./parse-twofa-bulk";
import { isBrowserCode, normalizeBrowserCode } from "./twofa-browser-code";
import { TWOFA_ADD_TABS, twofaBulkSectionTitle } from "./twofa-add-toc";
import type { TwofaAddManyResult } from "./useTwofaAccounts";
import { TwofaBulkInputFrame } from "./TwofaBulkInputFrame";
import { TwofaBulkSectionSummary } from "./TwofaBulkSectionSummary";
import "./twofa-add-form.css";

type Tab = "single" | "bulk";

const TWOFA_ID_PREFIX = "twofa-";

export type TwofaAddFormProps = {
  active: boolean;
  mode: "add" | "edit";
  initial?: TwofaAccount | null;
  initialDraft?: Partial<TwofaDraft> | null;
  /** When opened from search-with-no-match, customizes title. */
  searchQuery?: string;
  onClose: () => void;
  onSaveSingle: (draft: TwofaDraft) => "ok" | "conflict" | "fail";
  onImportMany: (drafts: TwofaDraft[]) => TwofaAddManyResult;
};

export function TwofaAddForm({
  active,
  mode,
  initial,
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
  const [bulkText, setBulkText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!active) return;
    setError(null);
    setTab("single");
    if (mode === "edit" && initial) {
      setService(initial.service);
      setBrowser(initial.browser ?? "");
      setAccount(initial.account);
      setPassword(initial.password ?? "");
      setSecret(initial.secret);
      setBulkText("");
    } else {
      setService(initialDraft?.service ?? "");
      setBrowser(initialDraft?.browser ?? "");
      setAccount(initialDraft?.account ?? "");
      setPassword(initialDraft?.password ?? "");
      setSecret(initialDraft?.secret ?? "");
      setBulkText("");
    }
  }, [
    active,
    mode,
    initial?.id,
    initial?.service,
    initial?.browser,
    initial?.account,
    initial?.password,
    initial?.secret,
    initialDraft?.service,
    initialDraft?.browser,
    initialDraft?.account,
    initialDraft?.password,
    initialDraft?.secret,
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
    if (mode === "edit") return [`${TWOFA_ID_PREFIX}single`];
    if (tab === "single") return [`${TWOFA_ID_PREFIX}single`];
    return [`${TWOFA_ID_PREFIX}bulk-input`];
  }, [mode, tab]);

  if (!active) return null;

  const onSubmitSingle = () => {
    if (!secret.trim()) {
      setError("2FA secret is required.");
      return;
    }
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
    };
    if (!generateCode(draft.service, draft.account, draft.secret)) {
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

  const title = searchQuery?.trim()
    ? "Add account"
    : mode === "edit"
      ? "Edit account"
      : "Add accounts";

  const singleFields = (
    <div className={HUB_TOOL_DETAIL_FORM_GRID_2_CLASS}>
      <label className="block min-w-0">
        <HubFormFieldLabel icon={Boxes} iconClassName="text-sky-300">
          Platform
        </HubFormFieldLabel>
        <input
          className="field auth-gate-field w-full"
          name="twofa-service"
          autoComplete="off"
          placeholder="Optional"
          value={service}
          onChange={(e) => setService(e.target.value)}
        />
      </label>
      <label className="block min-w-0">
        <HubFormFieldLabel icon={Globe} iconClassName="text-cyan-300">
          Browser
        </HubFormFieldLabel>
        <input
          className="field auth-gate-field w-full font-mono"
          name="twofa-browser"
          autoComplete="off"
          inputMode="numeric"
          placeholder="0100 — optional"
          maxLength={4}
          value={browser}
          onChange={(e) => setBrowser(e.target.value.replace(/\D/g, "").slice(0, 4))}
        />
      </label>
      <label className="block min-w-0">
        <HubFormFieldLabel icon={User} iconClassName="text-indigo-300">
          ID / account
        </HubFormFieldLabel>
        <input
          className="field auth-gate-field w-full"
          name="twofa-account-id"
          autoComplete="off"
          placeholder="Optional"
          value={account}
          readOnly={mode === "add"}
          onFocus={(e) => {
            if (mode === "add") e.currentTarget.readOnly = false;
          }}
          onChange={(e) => setAccount(e.target.value)}
        />
      </label>
      <label className="block min-w-0">
        <HubFormFieldLabel icon={LockKeyhole} iconClassName="text-amber-300">
          Password
        </HubFormFieldLabel>
        <input
          className="field auth-gate-field twofa-add-field-masked w-full"
          name="twofa-stored-password"
          type="text"
          autoComplete="off"
          data-lpignore="true"
          data-1p-ignore
          placeholder="Optional"
          value={password}
          readOnly={mode === "add"}
          onFocus={(e) => {
            if (mode === "add") e.currentTarget.readOnly = false;
          }}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <label className="block min-w-0">
        <HubFormFieldLabel icon={KeyRound} iconClassName="text-violet-300">
          2FA secret
        </HubFormFieldLabel>
        <input
          className="field auth-gate-field w-full font-mono"
          name="twofa-totp-secret"
          autoComplete="off"
          placeholder="Base32 — required"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
        />
      </label>
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
      {mode === "edit" ? (
        singlePanel
      ) : (
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
      )}

      {error ? <p className="auth-gate-message">{error}</p> : null}
    </form>
  );

  const hubFooter = (
    <>
      <HubToolDetailModalSecondaryAction label="Cancel" onClick={onClose} disabled={busy} />
      {tab === "bulk" && mode === "add" ? (
        <HubToolDetailModalPrimaryAction
          label={busy ? "Please wait…" : previewCount > 0 ? `Import (${previewCount})` : "Import"}
          onClick={onImportBulk}
          disabled={busy || !canTryBulkImport}
          busy={busy}
        />
      ) : (
        <HubToolDetailModalPrimaryAction
          label={mode === "edit" ? "Save changes" : "Add account"}
          onClick={onSubmitSingle}
          disabled={busy}
          busy={busy}
          icon={KeyRound}
        />
      )}
    </>
  );

  const isAdd = mode === "add";

  return (
    <HubToolDetailModal
      open={active}
      onClose={onClose}
      title={title}
      titleId="twofa-add-modal-title"
      headerIcon={KeyRound}
      headerIconClassName="text-indigo-300"
      shellClassName={`hub-add-modal twofa-add-modal${isAdd ? "" : " hub-tool-detail-modal--fit"}`}
      size={isAdd ? "detail" : "compact"}
      sectionIds={sectionIds}
      scrollRootSelector={HUB_TOOL_DETAIL_SCROLL_ROOT}
      toc={
        isAdd ? (
          <HubAddModalTocNav
            tabs={TWOFA_ADD_TABS}
            activeTab={tab}
            onTabChange={setTab}
            sectionIdPrefix={TWOFA_ID_PREFIX}
            scrollRootSelector={HUB_TOOL_DETAIL_SCROLL_ROOT}
          />
        ) : undefined
      }
      footer={hubFooter}
    >
      <div className="hub-add-modal__main">{formBody}</div>
    </HubToolDetailModal>
  );
}
