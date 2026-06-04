import type { ElementType } from "react";
import { Crown, ShieldCheck, Upload, UserRound } from "lucide-react";

const ROLE_META: Record<
  string,
  { icon: ElementType; className: string; badgeClass: string }
> = {
  owner: { icon: Crown, className: "text-indigo-300", badgeClass: "owner" },
  load: { icon: UserRound, className: "text-sky-300", badgeClass: "employee" },
  sync: { icon: Upload, className: "text-amber-300", badgeClass: "publisher" },
  manager: { icon: ShieldCheck, className: "text-purple-300", badgeClass: "manager" },
  publisher: { icon: Upload, className: "text-amber-300", badgeClass: "publisher" },
  employee: { icon: UserRound, className: "text-emerald-300", badgeClass: "employee" },
  member: { icon: UserRound, className: "text-slate-300", badgeClass: "employee" },
};

export function CookieAccessRoleBadge({ role }: { role: string }) {
  const key = role.trim().toLowerCase();
  const meta = ROLE_META[key] ?? ROLE_META.employee;
  const Icon = meta.icon;
  return (
    <span className={`hub-users-role-badge hub-users-role-badge--${meta.badgeClass}`}>
      <Icon size={12} className={`hub-users-role-badge-icon ${meta.className}`} aria-hidden />
      <span className="hub-users-role-badge-label">{role}</span>
    </span>
  );
}
