import { useState } from "react";
import { Link2 } from "lucide-react";
import { Glass } from "../../theme/p0008";
import { cookieLines } from "./noteUtils";
import type { NoteRow } from "./types";
import { readShareTokenFromUrl } from "./shareUtils";
import { usePublicShare } from "./usePublicShare";

/** Public read-only share — no sidebar; ?screen=share&token= */
export function PublicShareScreen() {
  const token = readShareTokenFromUrl();
  const { row, loading, error, unlocked, verifyPassword } = usePublicShare(token);
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [checking, setChecking] = useState(false);

  const onUnlock = async () => {
    setPwError("");
    setChecking(true);
    const ok = await verifyPassword(password);
    setChecking(false);
    if (!ok) setPwError("Incorrect password.");
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-6 text-sm text-[var(--muted)]">
        Missing share token in URL.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-6 text-sm text-[var(--muted)]">
        Loading…
      </div>
    );
  }

  if (error || !row) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-6 text-sm text-rose-300">
        {error || "Note not found."}
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="p0008-skin flex min-h-screen items-center justify-center bg-[var(--bg)] p-6">
        <Glass tone="cyan" className="mx-auto w-full max-w-md !p-6 text-center">
          <Link2 size={24} className="mx-auto mb-3 text-cyan-300" />
          <p className="text-[11px] text-[var(--muted)]">Shared note · read-only</p>
          <h1 className="mt-2 text-lg font-semibold">{row.title}</h1>
          <input
            className="field mx-auto mt-4 max-w-xs text-center text-[12px]"
            type="password"
            placeholder="Enter share password…"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void onUnlock()}
          />
          {pwError ? <p className="mt-2 text-[12px] text-rose-300">{pwError}</p> : null}
          <button type="button" className="btn mx-auto mt-3 text-[12px]" onClick={() => void onUnlock()} disabled={checking}>
            {checking ? "Checking…" : "View content"}
          </button>
        </Glass>
      </div>
    );
  }

  const lines = cookieLines(row.cookie_snapshot as NoteRow["cookie_snapshot"]);

  return (
    <div className="p0008-skin min-h-screen bg-[var(--bg)] p-6 text-[var(--text)]">
      <div className="mx-auto max-w-2xl">
        <p className="text-[11px] text-[var(--muted)]">P0020-Data-Box · shared read-only</p>
        <h1 className="mt-1 text-2xl font-semibold">{row.title}</h1>
        <Glass tone="indigo" label="Content" className="mt-4">
          <pre className="whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-indigo-100/90">{row.body_md || "—"}</pre>
        </Glass>
        {lines.length ? (
          <Glass tone="amber" label="Cookie snapshot (masked)" className="mt-4">
            <ul className="space-y-0.5 font-mono text-[10px] text-indigo-200/80">
              {lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </Glass>
        ) : null}
      </div>
    </div>
  );
}
