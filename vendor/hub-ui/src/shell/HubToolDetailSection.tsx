import type { ReactNode } from "react";

export const HUB_TOOL_DETAIL_SECTIONS_CLASS = "hub-tool-detail-modal__sections";
export const HUB_TOOL_DETAIL_FORM_GRID_CLASS = "hub-tool-detail-form-grid";
export const HUB_TOOL_DETAIL_FORM_GRID_2_CLASS = "hub-tool-detail-form-grid hub-tool-detail-form-grid--2";
export const HUB_TOOL_DETAIL_FORM_GRID_3_CLASS = "hub-tool-detail-form-grid hub-tool-detail-form-grid--3";

export type HubToolDetailSectionProps = {
  id: string;
  /** Section title — may include emoji prefix (matches TOC labels). */
  title: string;
  children: ReactNode;
  className?: string;
};

/** Bordered frame for one TOC section inside tool-detail modals. */
export function HubToolDetailSection({ id, title, children, className = "" }: HubToolDetailSectionProps) {
  return (
    <section id={id} className={`hub-tool-detail-section${className ? ` ${className}` : ""}`}>
      <header className="hub-tool-detail-section__header">
        <h3 className="hub-tool-detail-section__title">{title}</h3>
      </header>
      <div className="hub-tool-detail-section__body">{children}</div>
    </section>
  );
}

/** Flex column gap between detail sections — use on TocHighlightContent or wrap section lists. */
export function HubToolDetailSections({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`${HUB_TOOL_DETAIL_SECTIONS_CLASS}${className ? ` ${className}` : ""}`.trim()}>{children}</div>
  );
}
