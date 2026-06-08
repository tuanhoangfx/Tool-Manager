import { useEffect, useMemo, useRef, useState } from "react";
import { Boxes, FileSpreadsheet, Globe, KeyRound, LockKeyhole, Upload, User } from "lucide-react";
import {
  HubFormFieldLabel,
  HubToolDetailModal,
  HubToolDetailModalPrimaryAction,
  HubToolDetailModalSecondaryAction,
  HubToolDetailSection,
  HubTocSectionNav,
  HUB_TOOL_DETAIL_FORM_GRID_2_CLASS,
  HUB_TOOL_DETAIL_SCROLL_ROOT,
  HUB_TOOL_DETAIL_SECTIONS_CLASS,
} from "@tool-workspace/hub-ui";
import { generateCode } from "./totp";
import type { TwofaAccount, TwofaDraft } from "./types";
import {
  formatTwofaBulkLine,
  parseTwofaBulkFile,
  parseTwofaBulkText,
  TWOFA_BULK_FORMAT_HINT,
  validateTwofaBulkRows,
} from "./parse-twofa-bulk";
import { isBrowserCode, normalizeBrowserCode } from "./twofa-browser-code";
import { TWOFA_ADD_TABS, TWOFA_BULK_SECTIONS, twofaBulkSectionTitle } from "./twofa-add-toc";
import type { TwofaAddManyResult } from "./useTwofaAccounts";
import "./twofa-add-form.css";

type Tab = "single" | "bulk";

const TWOFA_ID_PREFIX = "twofa-";

function TwofaAddTocNav({
  tab,
  onTabChange,
  showBulkSections,
}: {
  tab: Tab;
  onTabChange: (next: Tab) => void;
  showBulkSections: boolean;
}) {
  const bulkNavItems = useMemo(
    () =>
      TWOFA_BULK_SECTIONS.filter((item) => item.id !== "bulk-preview" || showBulkSections).map(
        (item) => ({ id: item.id, label: item.label, emoji: item.emoji }),
      ),
    [showBulkSections],
  );

  return (
    <nav className="hub-toc-nav twofa-add-modal__toc" aria-label="Add mode">
      <ul className="hub-toc-nav__list space-y-0.5" role="tablist">
        {TWOFA_ADD_TABS.map((item) => {
          const active = tab === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                role="tab"
                aria-selected={active}
                className={`hub-toc-nav__item group relative z-[1] min-h-[var(--overview-toc-row-h,2rem)] w-full cursor-pointer text-left text-[13px] transition-colors${
                  active ? " is-active" : ""
                }`}
                onClick={() => onTabChange(item.id as Tab)}
              >
                <span className="hub-toc-nav__label flex min-w-0 items-center gap-1.5 truncate rounded-lg px-2 py-1 font-medium text-[var(--muted)] transition-all duration-200 group-hover:text-[var(--text)]">
                  <span className="shrink-0 text-[12px] leading-none opacity-90" aria-hidden>
                    {item.emoji}
                  </span>
                  <span className="truncate">{item.label}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {tab === "bulk" && bulkNavItems.length ? (
        <div className="twofa-add-modal__toc-sections mt-3 border-t border-white/5 pt-3">
          <HubTocSectionNav
            items={bulkNavItems}
            sectionIdPrefix={TWOFA_ID_PREFIX}
            scrollRootSelector={HUB_TOOL_DETAIL_SCROLL_ROOT}
          />
        </div>
      ) : (
        <div className="twofa-add-modal__toc-sections mt-3 border-t border-white/5 pt-3" aria-hidden />
      )}
    </nav>
  );
}

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
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>("single");
  const [service, setService] = useState("");
  const [browser, setBrowser] = useState("");
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [secret, setSecret] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!active) return;
    setError(null);
    setFileName(null);
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
    if (fileRef.current) fileRef.current.value = "";
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
  const previewCount = useMemo(
    () => validateTwofaBulkRows(parsed.rows).valid.length,
    [parsed.rows],
  );
  const canTryBulkImport = Boolean(bulkText.trim() || fileName);

  const sectionIds = useMemo(() => {
    if (mode === "edit") return [`${TWOFA_ID_PREFIX}single`];
    if (tab === "single") return [`${TWOFA_ID_PREFIX}single`];
    const ids = [`${TWOFA_ID_PREFIX}bulk-paste`, `${TWOFA_ID_PREFIX}bulk-file`];
    if (previewCount > 0) ids.push(`${TWOFA_ID_PREFIX}bulk-preview`);
    return ids;
  }, [mode, previewCount, tab]);

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

  const onImportBulk = async () => {
    setBusy(true);
    setError(null);
    try {
      const file = fileRef.current?.files?.[0];
      const result =
        file && fileName
          ? await parseTwofaBulkFile(file)
          : bulkText.trim()
            ? parsed
            : { rows: [], errors: [{ line: 0, message: "Paste rows or choose a file." }] };
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
    } catch {
      setError("Could not read file. Use .xlsx, .csv, or paste text.");
    } finally {
      setBusy(false);
    }
  };

  const onFileChange = async (file: File | null) => {
    if (!file) return;
    setFileName(file.name);
    setBusy(true);
    setError(null);
    try {
      const result = await parseTwofaBulkFile(file);
      setBulkText(result.rows.map((r) => formatTwofaBulkLine(r)).join("\n"));
      if (result.errors.length) {
        setError(`${result.errors.length} row(s) skipped while reading file.`);
      }
    } catch {
      setError("Could not parse Excel file.");
      setFileName(null);
      if (fileRef.current) fileRef.current.value = "";
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
    <div className={HUB_TOOL_DETAIL_SECTIONS_CLASS}>
      <HubToolDetailSection
        id={`${TWOFA_ID_PREFIX}bulk-paste`}
        title={twofaBulkSectionTitle("bulk-paste")}
      >
        <textarea
          className="field auth-gate-field w-full min-h-[120px] font-mono text-[11px] leading-relaxed"
          placeholder={TWOFA_BULK_FORMAT_HINT}
          value={bulkText}
          onChange={(e) => {
            setBulkText(e.target.value);
            setFileName(null);
            if (fileRef.current) fileRef.current.value = "";
          }}
        />
      </HubToolDetailSection>
      <HubToolDetailSection
        id={`${TWOFA_ID_PREFIX}bulk-file`}
        title={twofaBulkSectionTitle("bulk-file")}
      >
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv,.txt"
            className="hidden"
            onChange={(e) => void onFileChange(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[.04] px-2.5 py-1.5 text-[11px] font-medium text-[var(--text)] transition-colors hover:bg-white/[.08]"
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={14} aria-hidden />
            Excel / CSV
          </button>
          {fileName ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-[var(--muted)]">
              <FileSpreadsheet size={12} className="text-emerald-300" />
              {fileName}
            </span>
          ) : null}
        </div>
      </HubToolDetailSection>
      {previewCount > 0 ? (
        <HubToolDetailSection
          id={`${TWOFA_ID_PREFIX}bulk-preview`}
          title={twofaBulkSectionTitle("bulk-preview")}
        >
          <p className="text-xs tabular-nums text-emerald-300">{previewCount} valid row(s)</p>
        </HubToolDetailSection>
      ) : null}
    </div>
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
        <div className="twofa-add-modal__panels">
          <div
            className={`twofa-add-modal__panel${tab === "single" ? "" : " twofa-add-modal__panel--hidden"}`}
          >
            {singlePanel}
          </div>
          <div
            className={`twofa-add-modal__panel${tab === "bulk" ? "" : " twofa-add-modal__panel--hidden"}`}
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
          onClick={() => void onImportBulk()}
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
      shellClassName={`twofa-add-modal${isAdd ? "" : " hub-tool-detail-modal--fit"}`}
      size={isAdd ? "detail" : "compact"}
      sectionIds={sectionIds}
      scrollRootSelector={HUB_TOOL_DETAIL_SCROLL_ROOT}
      toc={
        isAdd ? (
          <TwofaAddTocNav
            tab={tab}
            onTabChange={setTab}
            showBulkSections={previewCount > 0}
          />
        ) : undefined
      }
      footer={hubFooter}
    >
      <div className="twofa-add-modal__main">{formBody}</div>
    </HubToolDetailModal>
  );
}
