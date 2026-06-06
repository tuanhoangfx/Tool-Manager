import { CircleHelp } from "lucide-react";
import { compactIconSize } from "../ui-scale";

type HubHintTooltipProps = {
  content: string;
};

/** Compact hover/focus hint for Settings toggles and form rows. */
export function HubHintTooltip({ content }: HubHintTooltipProps) {
  return (
    <span
      className="hub-hint-tooltip"
      tabIndex={0}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <CircleHelp size={compactIconSize(10)} className="text-[var(--muted)]" aria-hidden />
      <span className="hub-hint-tooltip__bubble" role="tooltip">
        {content}
      </span>
    </span>
  );
}
