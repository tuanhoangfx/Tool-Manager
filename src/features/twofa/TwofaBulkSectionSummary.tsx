import type { summarizeTwofaBulkLineStatuses } from "./parse-twofa-bulk";

type BulkSummary = ReturnType<typeof summarizeTwofaBulkLineStatuses>;

export function TwofaBulkSectionSummary({ summary }: { summary: BulkSummary }) {
  return (
    <div className="twofa-bulk-section-summary hub-tool-detail-section__title" aria-live="polite">
      {summary.valid > 0 ? (
        <span className="twofa-bulk-section-summary__item twofa-bulk-section-summary__item--valid">
          {summary.valid} valid
        </span>
      ) : (
        <span className="twofa-bulk-section-summary__item twofa-bulk-section-summary__item--muted">
          No valid rows
        </span>
      )}
      {summary.invalid > 0 ? (
        <>
          <span className="twofa-bulk-section-summary__sep" aria-hidden>
            ·
          </span>
          <span className="twofa-bulk-section-summary__item twofa-bulk-section-summary__item--invalid">
            {summary.invalid} error{summary.invalid === 1 ? "" : "s"}
          </span>
        </>
      ) : null}
      {summary.skip > 0 ? (
        <>
          <span className="twofa-bulk-section-summary__sep" aria-hidden>
            ·
          </span>
          <span className="twofa-bulk-section-summary__item twofa-bulk-section-summary__item--skip">
            {summary.skip} skipped
          </span>
        </>
      ) : null}
    </div>
  );
}
