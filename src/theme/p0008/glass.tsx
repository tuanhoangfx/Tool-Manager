import type { ReactNode } from "react";

/** Glass + section primitives — cloned from P0008 design-preview/page.tsx */
export const GLOW: Record<string, string> = {
  indigo: "from-indigo-500/15 via-indigo-500/5 border-indigo-400/30 text-indigo-200",
  emerald: "from-emerald-500/15 via-emerald-500/5 border-emerald-400/30 text-emerald-200",
  cyan: "from-cyan-500/15 via-cyan-500/5 border-cyan-400/30 text-cyan-200",
  purple: "from-purple-500/15 via-purple-500/5 border-purple-400/30 text-purple-200",
  amber: "from-amber-500/15 via-amber-500/5 border-amber-400/30 text-amber-200",
  rose: "from-rose-500/15 via-rose-500/5 border-rose-400/30 text-rose-200",
  slate: "from-slate-500/15 via-slate-500/5 border-slate-400/30 text-slate-200",
};

export function Glass({
  tone = "indigo",
  label,
  icon,
  children,
  className = "",
}: {
  tone?: keyof typeof GLOW;
  label?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`relative overflow-hidden rounded-xl border bg-gradient-to-br ${GLOW[tone]} to-transparent p-3 backdrop-blur ${className}`}
    >
      {label ? (
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider opacity-80">
          {icon}
          {label}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function DesignSection({
  num,
  title,
  lang,
  children,
}: {
  num: string;
  title: string;
  lang: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-indigo-500/20 text-base font-bold text-indigo-200 ring-1 ring-indigo-500/40">
          {num}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold leading-tight">{title}</h2>
          <p className="text-xs text-indigo-300/80">{lang}</p>
        </div>
      </div>
      <div className="rounded-xl border border-white/10 bg-black/40 p-3">{children}</div>
    </section>
  );
}

export function StatusBadge({
  children,
  tone = "emerald",
}: {
  children: ReactNode;
  tone?: "emerald" | "amber" | "rose";
}) {
  const tones = {
    emerald: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40",
    amber: "bg-amber-500/20 text-amber-200 border-amber-500/40",
    rose: "bg-rose-500/20 text-rose-200 border-rose-500/40",
  };
  return <span className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] ${tones[tone]}`}>{children}</span>;
}
