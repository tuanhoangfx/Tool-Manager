import type { ReactNode } from "react";
import { HubInlineCopyControl } from "@tool-workspace/hub-ui";

/** Sheet grid cell — inline copy; check beside last character (hub-ui HubInlineCopyControl). */
export function SheetGridCopyCell({ value, children }: { value: string; children: ReactNode }) {
  const text = String(value ?? "").trim();
  if (!text) return <span className="hub-users-cell-muted">—</span>;

  return (
    <HubInlineCopyControl
      value={text}
      className="sheet-grid-copy-control"
      valueClassName="sheet-grid-copy-control__value"
    >
      {children}
    </HubInlineCopyControl>
  );
}
