import { RotateCcw } from "lucide-react";
import { resetTwofaTableColumns } from "./twofa-table-prefs";

/** Table columns section header action — lives in Settings section title row. */
export function TwofaTableColumnsResetAction() {
  return (
    <button
      type="button"
      onClick={() => resetTwofaTableColumns()}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]"
    >
      <RotateCcw size={10} aria-hidden />
      Reset columns
    </button>
  );
}
