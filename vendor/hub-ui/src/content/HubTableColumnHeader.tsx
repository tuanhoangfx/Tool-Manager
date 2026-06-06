import type { LucideIcon } from "lucide-react";

export type HubTableColumnHeaderProps = {
  label: string;
  icon: LucideIcon;
  iconClassName?: string;
};

/** Centered table header label + icon — golden hub-users-table pattern. */
export function HubTableColumnHeader({
  label,
  icon: Icon,
  iconClassName = "hub-users-th-icon--name",
}: HubTableColumnHeaderProps) {
  return (
    <span className="hub-users-th-label">
      <Icon size={13} className={`hub-users-th-icon ${iconClassName}`} aria-hidden />
      <span className="hub-users-th-text">{label}</span>
    </span>
  );
}
