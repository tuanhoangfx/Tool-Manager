import type { ReactNode } from "react";

export function PageHeader({
  title,
  desc,
  actions,
}: {
  title: string;
  desc?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="anim-fade mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {desc ? <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">{desc}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
