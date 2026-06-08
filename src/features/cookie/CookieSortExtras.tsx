import { ArrowDownWideNarrow } from "lucide-react";
import { SettingsOptionFilter } from "../../lib/settings-option-filter";
import {
  cookieSortSettingLabel,
  DEFAULT_COOKIE_LIST_SORT,
  patchCookieListPrefs,
  type CookieListSort,
} from "./cookie-list-prefs";

const SORT_OPTIONS: CookieListSort[] = ["updated", "created", "platform", "title"];

type Props = {
  sort: CookieListSort;
  onSortChange?: (sort: CookieListSort) => void;
};

export function CookieSortExtras({ sort, onSortChange }: Props) {
  const pick = (next: CookieListSort) => {
    patchCookieListPrefs({ csort: next === DEFAULT_COOKIE_LIST_SORT ? null : next });
    onSortChange?.(next);
  };

  return (
    <SettingsOptionFilter
      filterKey="cookie-list-sort"
      title="Route sort"
      icon={ArrowDownWideNarrow}
      iconClassName="text-sky-300"
      hint="Applies to the routes list and card grid."
      options={SORT_OPTIONS}
      value={sort}
      onChange={pick}
      formatLabel={cookieSortSettingLabel}
    />
  );
}
