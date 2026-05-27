import type { ReactNode } from "react";

type Props = {
  label: string;
  desc?: string;
  children: ReactNode;
};

export function SettingRow({ label, desc, children }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 py-3 last:border-0">
      <div className="min-w-[10rem] flex-1">
        <div className="text-[13px] font-medium">{label}</div>
        {desc ? <div className="text-[11px] text-[var(--muted)]">{desc}</div> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
