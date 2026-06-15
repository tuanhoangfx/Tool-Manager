import { useCallback, useMemo, useRef } from "react";
import { AlertCircle, Check, Minus } from "lucide-react";
import {
  describeTwofaBulkLineFields,
  getTwofaBulkLineFormats,
  getTwofaBulkLineStatuses,
  TWOFA_BULK_FORMAT_HINT,
  type TwofaBulkLineStatus,
} from "./parse-twofa-bulk";

const BULK_LINE_HEIGHT_PX = 26;

type TwofaBulkInputFrameProps = {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

type FormatTone = "valid" | "invalid" | "skip" | "empty";

function formatToneFromStatus(status: TwofaBulkLineStatus): FormatTone {
  if (status.kind === "valid") return "valid";
  if (status.kind === "invalid") return "invalid";
  if (status.kind === "skip") return "skip";
  return "empty";
}

function TwofaBulkLineBadge({
  status,
  onFocusLine,
}: {
  status: TwofaBulkLineStatus;
  onFocusLine?: () => void;
}) {
  if (status.kind === "empty") {
    return <span className="twofa-bulk-line-badge twofa-bulk-line-badge--empty" aria-hidden />;
  }
  if (status.kind === "skip") {
    return (
      <span className="twofa-bulk-line-badge twofa-bulk-line-badge--skip" title="Skipped (header or comment)">
        <Minus size={10} aria-hidden />
      </span>
    );
  }
  if (status.kind === "valid") {
    return (
      <span className="twofa-bulk-line-badge twofa-bulk-line-badge--valid" title="Valid row">
        <Check size={10} strokeWidth={2.5} aria-hidden />
      </span>
    );
  }
  return (
    <button
      type="button"
      className="twofa-bulk-line-badge twofa-bulk-line-badge--invalid twofa-bulk-line-badge--action"
      title={`${status.message} — click to focus line`}
      onClick={onFocusLine}
    >
      <AlertCircle size={10} aria-hidden />
    </button>
  );
}

function TwofaBulkLineFormatTag({
  format,
  tone,
  tooltip,
}: {
  format: string | null;
  tone: FormatTone;
  tooltip: string | null;
}) {
  if (!format) {
    return <span className="twofa-bulk-line-format twofa-bulk-line-format--empty" aria-hidden />;
  }
  const title = tooltip ? `${format}\n${tooltip}` : format;
  return (
    <span
      className={`twofa-bulk-line-format twofa-bulk-line-format--${tone}`}
      title={title}
    >
      {format}
    </span>
  );
}

/** Paste-only bulk input — data left, status + format right. */
export function TwofaBulkInputFrame({ value, disabled = false, onChange }: TwofaBulkInputFrameProps) {
  const gutterRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const lineStatuses = useMemo(() => getTwofaBulkLineStatuses(value), [value]);
  const lineFormats = useMemo(() => getTwofaBulkLineFormats(value), [value]);
  const displayLines = useMemo(() => {
    const lines = value.split(/\r?\n/);
    return lines.length === 0 ? [""] : lines;
  }, [value]);

  const syncGutterScroll = useCallback(() => {
    const textarea = textareaRef.current;
    const gutter = gutterRef.current;
    if (textarea && gutter) gutter.scrollTop = textarea.scrollTop;
  }, []);

  const focusLine = useCallback(
    (lineIndex: number) => {
      const textarea = textareaRef.current;
      if (!textarea || disabled) return;

      const lines = value.split(/\r?\n/);
      let start = 0;
      for (let i = 0; i < lineIndex; i++) {
        start += lines[i].length + 1;
      }
      const lineText = lines[lineIndex] ?? "";
      const end = start + lineText.length;

      textarea.focus();
      textarea.setSelectionRange(start, end);
      const targetScroll = lineIndex * BULK_LINE_HEIGHT_PX - textarea.clientHeight / 2 + BULK_LINE_HEIGHT_PX / 2;
      textarea.scrollTop = Math.max(0, targetScroll);
      syncGutterScroll();
    },
    [disabled, syncGutterScroll, value],
  );

  return (
    <div className="twofa-bulk-input-frame">
      <div className="twofa-bulk-input-frame__editor">
        <textarea
          ref={textareaRef}
          className="twofa-bulk-input-frame__textarea field auth-gate-field"
          placeholder={TWOFA_BULK_FORMAT_HINT}
          value={value}
          disabled={disabled}
          spellCheck={false}
          onScroll={syncGutterScroll}
          onChange={(e) => onChange(e.target.value)}
        />
        <div ref={gutterRef} className="twofa-bulk-input-frame__gutter" aria-hidden>
          {displayLines.map((line, index) => {
            const status = lineStatuses[index] ?? { kind: "empty" as const };
            return (
              <div key={index} className="twofa-bulk-input-frame__gutter-row">
                <TwofaBulkLineBadge
                  status={status}
                  onFocusLine={status.kind === "invalid" ? () => focusLine(index) : undefined}
                />
                <TwofaBulkLineFormatTag
                  format={lineFormats[index] ?? null}
                  tone={formatToneFromStatus(status)}
                  tooltip={describeTwofaBulkLineFields(line)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
