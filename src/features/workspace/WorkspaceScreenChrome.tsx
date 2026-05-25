import type { ReactNode } from "react";
import { AppTabHeader, FilterBar } from "../../components/sales-shell";
import type { WorkspaceScreen } from "../../lib/workspace-screen";
import { screenChromeConfig } from "./workspace-screen-meta";

type Props = {
  screen: WorkspaceScreen;
  query: string;
  onQueryChange: (q: string) => void;
  toolbar?: ReactNode;
  children: ReactNode;
};

/** P0004 Hub chrome: sticky tab header + search row + scrollable body */
export function WorkspaceScreenChrome({ screen, query, onQueryChange, toolbar, children }: Props) {
  const cfg = screenChromeConfig(screen);

  const filterBar = cfg.showSearch ? (
    <FilterBar
      layout="hub"
      pinSticky
      headerPinned
      embedded
      placeholder={cfg.searchPlaceholder}
      query={query}
      onQueryChange={onQueryChange}
      values={{}}
      onValuesChange={() => {}}
      toolbar={toolbar}
    />
  ) : null;

  return (
    <div
      className="anim-fade relative min-h-0"
      data-search-pin={cfg.showSearch ? true : undefined}
      data-header-pin={cfg.showSearch ? true : undefined}
    >
      <div className="hub-chrome-sticky sticky top-0 z-40 -mx-6 border-b border-white/5 bg-[var(--bg)]">
        <AppTabHeader
          ariaLabel={cfg.ariaLabel}
          titleIcon={cfg.titleIcon}
          titleIconClass={cfg.titleIconClass}
          title={cfg.title}
          metaItems={cfg.metaItems}
          centerStats={[]}
          pinSticky={false}
          dividerBelow={false}
          embedded
        />
        {filterBar}
      </div>
      <div className="relative z-0 pt-1">{children}</div>
    </div>
  );
}
