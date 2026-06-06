import { HubTocSectionNav, type HubTocNavItem } from "@tool-workspace/hub-ui";
import type { OverviewTocItem } from "./overview-toc";

type Props = {
  items: readonly OverviewTocItem[];
  idPrefix?: string;
  scrollRootSelector?: string;
  className?: string;
};

export function TocSectionNav({ items, idPrefix = "", scrollRootSelector, className = "" }: Props) {
  const navItems: HubTocNavItem[] = items.map((item) => ({
    id: item.id,
    label: item.label,
    emoji: item.emoji,
  }));

  return (
    <div className={`hub-toc-nav${className ? ` ${className}` : ""}`}>
      <HubTocSectionNav items={navItems} sectionIdPrefix={idPrefix} scrollRootSelector={scrollRootSelector} />
    </div>
  );
}
