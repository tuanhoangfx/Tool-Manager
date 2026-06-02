import { AlertTriangle, Copy } from "lucide-react";
import { useCallback, useState } from "react";
import type { CookieSchemaHealth } from "./cookieSchemaHealth";
import toolManifest from "../../../tool.manifest.json";

const APPLY_ALL_FILE =
  toolManifest.supabase?.cookieBridge?.applySql ?? "supabase/APPLY_ALL_P0020_COOKIE_BRIDGE.sql";
const SQL_EDITOR_URL =
  toolManifest.supabase?.sqlEditor ?? "https://supabase.com/dashboard";
const DB_URL_NOTE = toolManifest.supabase?.localEnv?.note;

export function SupabaseMigrateBanner({
  health,
  onRecheck,
}: {
  health?: CookieSchemaHealth | null;
  onRecheck?: () => void | Promise<void>;
}) {
  const [copied, setCopied] = useState(false);
  const copySqlHint = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(APPLY_ALL_FILE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, []);

  if (!health || health.ok) return null;

  const failed = health.checks.filter((c) => !c.ok).map((c) => c.name).join(", ");
  const text = `Cookie bridge schema chưa đủ (${failed}). ${health.fixHint}`;

  return (
    <div className="mb-4 flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-[12px] text-amber-100">
      <AlertTriangle size={18} className="shrink-0 text-amber-400" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">Supabase schema required</p>
        <p className="mt-1 leading-relaxed text-amber-200/90">{text}</p>
        {health && !health.ok ? (
          <ul className="mt-2 list-inside list-disc text-[11px] text-amber-200/80">
            {health.checks.map((c) => (
              <li key={c.name} className={c.ok ? "text-emerald-300/90" : "text-rose-200/90"}>
                {c.ok ? "OK" : "FAIL"}: {c.name}
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mt-2 font-mono text-[10px] text-amber-300/80">File: {APPLY_ALL_FILE}</p>
        {DB_URL_NOTE ? (
          <p className="mt-1 text-[10px] text-amber-200/70">
            DB: <code className="text-amber-300/90">SUPABASE_DB_URL</code> in tool.manifest.json →
            supabase.localEnv (optional .env.local for <code className="text-amber-300/90">pnpm apply:cookie</code>)
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void copySqlHint()}
            className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2 py-1 text-[11px] hover:bg-amber-500/25"
          >
            <Copy size={12} />
            {copied ? "Copied path" : "Copy SQL path"}
          </button>
          {onRecheck ? (
            <button
              type="button"
              onClick={onRecheck}
              className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-2 py-1 text-[11px] hover:bg-amber-500/25"
            >
              Re-check schema
            </button>
          ) : null}
          <a
            href={SQL_EDITOR_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-2 py-1 text-[11px] text-amber-100 hover:bg-amber-500/25"
          >
            Open SQL Editor
          </a>
        </div>
      </div>
    </div>
  );
}
