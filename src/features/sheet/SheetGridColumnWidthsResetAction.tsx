import { RotateCcw } from "lucide-react";
import { resetSheetGridColumnWidths } from "./sheet-grid-prefs";

/** Table columns section header — reset saved resize weights. */
export function SheetGridColumnWidthsResetAction({
  sheetId,
  onReset,
}: {
  sheetId: string | null;
  onReset: (next: ReturnType<typeof resetSheetGridColumnWidths>) => void;
}) {
  return (
    <button
      type="button"
      disabled={!sheetId}
      onClick={() => {
        if (!sheetId) return;
        onReset(resetSheetGridColumnWidths(sheetId));
      }}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <RotateCcw size={10} aria-hidden />
      Reset widths
    </button>
  );
}
