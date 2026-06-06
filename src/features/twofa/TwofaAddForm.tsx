import { useEffect, useMemo, useRef, useState } from "react";
import { FileSpreadsheet, KeyRound, Upload } from "lucide-react";
import {
  HubToolDetailModal,
  HubToolDetailModalPrimaryAction,
  HubToolDetailModalSecondaryAction,
} from "@tool-workspace/hub-ui";
import { generateCode } from "./totp";
import type { TwofaAccount, TwofaDraft } from "./types";
import {
  formatTwofaBulkLine,
  parseTwofaBulkFile,
  parseTwofaBulkText,
  validateTwofaBulkRows,
} from "./parse-twofa-bulk";
import "./twofa-add-form.css";

type Tab = "single" | "bulk";

export type TwofaAddFormProps = {
  active: boolean;
  mode: "add" | "edit";
  initial?: TwofaAccount | null;
  initialDraft?: Partial<TwofaDraft> | null;
  /** When opened from search-with-no-match, customizes title/subtitle. */
  searchQuery?: string;
  onClose: () => void;
  onSaveSingle: (draft: TwofaDraft) => boolean;
  onImportMany: (drafts: TwofaDraft[]) => number;
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
      setAccount(initial.account);
      setPassword(initial.password ?? "");
      setSecret(initial.secret);
      setBulkText("");
    } else {
      setService(initialDraft?.service ?? "");
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
    initial?.account,
    initial?.password,
    initial?.secret,
    initialDraft?.service,
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

  if (!active) return null;

  const onSubmitSingle = () => {
    if (!secret.trim()) {
      setError("2FA secret is required.");
      return;
    }
    const draft = { service, account, password: password.trim() || undefined, secret };
    if (!generateCode(draft.service, draft.account, draft.secret)) {
      setError("Invalid Base32 secret.");
      return;
    }
    const ok = onSaveSingle(draft);
    if (!ok) {
      setError("Could not save entry.");
      return;
    }
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
      const added = onImportMany(valid);
      if (allErrors.length) {
        setError(`Imported ${added}. Skipped ${allErrors.length} line(s).`);
        if (added > 0) onClose();
        return;
      }
      if (added > 0) onClose();
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

  const subtitle = searchQuery?.trim()
    ? `No match for "${searchQuery.trim()}" — fill in or adjust fields below.`
    : mode === "edit"
      ? "Update one TOTP entry stored on this device."
      : "Single entry or bulk import (paste or Excel).";

  const tabs =
    mode === "add" ? (
      <div className="auth-gate-tabs" role="tablist" aria-label="Add mode">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "single"}
          className={`auth-gate-tab${tab === "single" ? " auth-gate-tab--active" : ""}`}
          onClick={() => setTab("single")}
        >
          Single
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "bulk"}
          className={`auth-gate-tab${tab === "bulk" ? " auth-gate-tab--active" : ""}`}
          onClick={() => setTab("bulk")}
        >
          Bulk
        </button>
      </div>
    ) : null;

  const formBody = (
    <form
      className="auth-gate-form"
      autoComplete="off"
      onSubmit={(e) => e.preventDefault()}
      data-twofa-credential-form
    >
      {tab === "single" || mode === "edit" ? (
        <>
          <input
            className="field auth-gate-field w-full"
            name="twofa-service"
            autoComplete="off"
            placeholder="Platform (optional)"
            value={service}
            onChange={(e) => setService(e.target.value)}
          />
          <input
            className="field auth-gate-field w-full"
            name="twofa-account-id"
            autoComplete="off"
            placeholder="ID / account (optional)"
            value={account}
            readOnly={mode === "add"}
            onFocus={(e) => {
              if (mode === "add") e.currentTarget.readOnly = false;
            }}
            onChange={(e) => setAccount(e.target.value)}
          />
          <input
            className="field auth-gate-field twofa-add-field-masked w-full"
            name="twofa-stored-password"
            type="text"
            autoComplete="off"
            data-lpignore="true"
            data-1p-ignore
            placeholder="Password (optional)"
            value={password}
            readOnly={mode === "add"}
            onFocus={(e) => {
              if (mode === "add") e.currentTarget.readOnly = false;
            }}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            className="field auth-gate-field w-full font-mono"
            name="twofa-totp-secret"
            autoComplete="off"
            placeholder="2FA secret (Base32) — required"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
          />
        </>
      ) : (
        <>
          <p className="auth-gate-hint">
            One secret per line, or <span className="auth-gate-mono">Platform|ID|2FA</span> /{" "}
            <span className="auth-gate-mono">Platform|2FA</span> — platform &amp; ID optional.
          </p>
          <textarea
            className="field auth-gate-field w-full min-h-[120px] font-mono text-[11px] leading-relaxed"
            placeholder="Paste rows here"
            value={bulkText}
            onChange={(e) => {
              setBulkText(e.target.value);
              setFileName(null);
              if (fileRef.current) fileRef.current.value = "";
            }}
          />
          <p className="auth-gate-hint">
            Examples:{" "}
            <span className="auth-gate-mono">Google|user@gmail.com|JBSWY3DPEHPK3PXP</span>
            {" · "}
            <span className="auth-gate-mono">GitHub|dev|mypass|JBSWY3DPEHPK3PXP</span>
          </p>
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
          {previewCount > 0 ? (
            <p className="auth-gate-ok">{previewCount} valid row(s) ready to import.</p>
          ) : null}
        </>
      )}

      {error ? <p className="auth-gate-message">{error}</p> : null}
    </form>
  );

  const hubFooter = (
    <>
      <HubToolDetailModalSecondaryAction label="Cancel" onClick={onClose} />
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

  return (
    <HubToolDetailModal
      open={active}
      onClose={onClose}
      title={title}
      titleId="twofa-add-modal-title"
      headerIcon={KeyRound}
      headerIconClassName="text-indigo-300"
      shellClassName="hub-header-panel-modal"
      size="compact"
      footer={hubFooter}
      bodyClassName="modal-shell__scroll--user-access"
    >
      <p className="mb-3 text-xs text-[var(--muted)]">{subtitle}</p>
      {tabs}
      {formBody}
    </HubToolDetailModal>
  );
}
