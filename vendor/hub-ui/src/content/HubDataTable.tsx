import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { HubTableColumnHeader } from "./HubTableColumnHeader";

export type HubTableColumn = {
  key: string;
  label: string;
  className?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  /** Custom header cell (sort buttons, select-all, etc.) */
  header?: ReactNode;
};

export function HubDataTable({
  columns,
  children,
  empty,
}: {
  columns: HubTableColumn[];
  children: ReactNode;
  empty?: ReactNode;
}) {
  return (
    <div className="hub-users-table-wrap overflow-hidden rounded-xl border border-white/5">
      <table className="hub-users-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.className} scope="col">
                {col.header ??
                  (col.icon ? (
                    <HubTableColumnHeader label={col.label} icon={col.icon} iconClassName={col.iconClassName} />
                  ) : (
                    <span className="hub-users-th-text">{col.label}</span>
                  ))}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {empty ?? null}
          {children}
        </tbody>
      </table>
    </div>
  );
}

export function HubTableEmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-10 text-center text-[var(--muted)]">
        {children}
      </td>
    </tr>
  );
}
