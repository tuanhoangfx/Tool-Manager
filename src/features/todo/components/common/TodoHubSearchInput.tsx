import { Search } from "lucide-react";
import { compactIconSize } from "../../../../lib/ui-scale";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
};

/** Hub `.field` search input — Activity/Notifications modals + filter rows. */
export function TodoHubSearchInput({ value, onChange, placeholder, className }: Props) {
  return (
    <div className={`relative min-w-0 ${className ?? ""}`.trim()}>
      <Search
        size={compactIconSize(14)}
        className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-[var(--muted)]"
        aria-hidden
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="field w-full text-sm"
        style={{ paddingLeft: 28 }}
      />
    </div>
  );
}
