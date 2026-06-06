import type { ReactNode } from "react";

export type HubSettingsTocItem = {
  id: string;
  label: string;
  icon: ReactNode;
};

type Props = {
  items: HubSettingsTocItem[];
  activeId: string;
  onSelect: (id: string) => void;
};

/** Left TOC rail — matches Cookie Auto download FAB / overview TOC nav. */
export function HubSettingsTocNav({ items, activeId, onSelect }: Props) {
  return (
    <nav className="hub-toc-nav__list space-y-0.5" aria-label="Settings sections">
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`hub-toc-nav__item group relative z-[1] min-h-[var(--overview-toc-row-h,2rem)] w-full cursor-pointer text-left text-[13px] transition-colors${
              active ? " is-active" : ""
            }`}
          >
            <span className="hub-toc-nav__label flex min-w-0 items-center gap-1.5 truncate rounded-lg px-2 py-1 font-medium text-[var(--muted)] transition-all duration-200 group-hover:text-[var(--text)]">
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${
                  active
                    ? "border-indigo-300/30 bg-indigo-500/20 text-indigo-200"
                    : "border-white/10 bg-white/[.03] text-[var(--muted)] group-hover:text-indigo-200"
                }`}
                aria-hidden
              >
                <span className="[&>svg]:size-[var(--hub-settings-toc-icon,11px)]">{item.icon}</span>
              </span>
              <span className="truncate">{item.label}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
