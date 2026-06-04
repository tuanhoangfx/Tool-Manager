import type { ElementType } from "react";

export function RdpThLabel({
  icon: Icon,
  label,
  iconClass,
  title,
}: {
  icon: ElementType;
  label: string;
  iconClass: string;
  title?: string;
}) {
  return (
    <span className="rdp-th-label" title={title}>
      <Icon size={12} className={`rdp-th-icon ${iconClass}`} aria-hidden />
      <span>{label}</span>
    </span>
  );
}
