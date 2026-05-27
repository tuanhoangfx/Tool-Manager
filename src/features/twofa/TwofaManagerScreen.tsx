import { useMemo, useState } from "react";
import { Copy, Pencil, Plus, Shield, Trash2 } from "lucide-react";
import { PageHeader } from "../design-preview/screens/PageHeader";
import { generateCode, secondsRemaining } from "./totp";
import { useTwofaAccounts } from "./useTwofaAccounts";
import type { TwofaAccount } from "./types";
import { useNotesAuth } from "../notes/useNotesAuth";
import { NotesAuthGate } from "../notes/NotesAuthGate";

function maskSecret(secret: string) {
  if (secret.length <= 8) return "••••••••";
  return `${secret.slice(0, 4)}…${secret.slice(-4)}`;
}

function CodeCell({ account }: { account: TwofaAccount }) {
  const code = generateCode(account.service, account.account, account.secret);
  const left = secondsRemaining();
  const pct = (left / 30) * 100;

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => void copy()}
        className="inline-flex items-center gap-2 rounded-lg bg-cyan-500/20 px-3 py-1 font-mono text-lg tracking-[0.35em] text-cyan-200 transition hover:bg-cyan-500/30"
        title="Copy code"
      >
        {code ?? "------"}
        <Copy size={14} className="tracking-normal opacity-70" />
      </button>
      <div className="flex items-center gap-2 text-[10px] text-amber-200/90">
        <span>{left}s</span>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-amber-400/80 transition-all duration-1000"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function TwofaManagerScreen({
  shellMode,
  query = "",
}: {
  shellMode?: boolean;
  query?: string;
} = {}) {
  const { session } = useNotesAuth();
  const { accounts, add, update, remove } = useTwofaAccounts();
  const [service, setService] = useState("");
  const [accountName, setAccountName] = useState("");
  const [secret, setSecret] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!session) {
    return <NotesAuthGate variant="twofa" />;
  }

  const editing = useMemo(() => accounts.find((a) => a.id === editingId), [accounts, editingId]);

  const visibleAccounts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) => a.service.toLowerCase().includes(q) || a.account.toLowerCase().includes(q),
    );
  }, [accounts, query]);

  const resetForm = () => {
    setService("");
    setAccountName("");
    setSecret("");
    setEditingId(null);
    setError(null);
  };

  const startEdit = (row: TwofaAccount) => {
    setEditingId(row.id);
    setService(row.service);
    setAccountName(row.account);
    setSecret(row.secret);
    setError(null);
  };

  const onSubmit = () => {
    const draft = { service, account: accountName, secret };
    const testCode = generateCode(draft.service, draft.account, draft.secret);
    if (!testCode) {
      setError("Invalid secret (Base32 TOTP). Please verify the value from your authenticator app.");
      return;
    }
    const ok = editingId ? update(editingId, draft) : add(draft);
    if (!ok) {
      setError("Please fill Service, Account, and Secret.");
      return;
    }
    resetForm();
  };

  return (
    <div className="anim-fade">
      {!shellMode ? (
        <PageHeader
          title="2FA Manager"
          desc="Local TOTP — Service · Account · Secret · 6-digit codes rotate every 30s. Data is stored in your browser."
          actions={
            editing ? (
              <button type="button" className="btn-ghost btn text-[12px]" onClick={resetForm}>
                Cancel edit
              </button>
            ) : null
          }
        />
      ) : null}

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <input
          className="field text-[12px]"
          placeholder="Service (Google, GitHub…)"
          value={service}
          onChange={(e) => setService(e.target.value)}
        />
        <input
          className="field text-[12px]"
          placeholder="Account name"
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
        />
        <input
          className="field font-mono text-[12px]"
          placeholder="Secret (Base32)"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
        />
      </div>
      {error ? <p className="mb-3 text-[12px] text-rose-300">{error}</p> : null}
      <button type="button" className="btn mb-4 inline-flex gap-2 text-[12px]" onClick={onSubmit}>
        {editing ? <Pencil size={14} /> : <Plus size={14} />}
        {editing ? "Update" : "Add"}
      </button>

      {visibleAccounts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[.02] px-6 py-10 text-center text-sm text-[var(--muted)]">
          <Shield className="mx-auto mb-2 text-indigo-300" size={28} />
          No 2FA entries yet. Add a Base32 secret from Google Authenticator or an export.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[36rem] text-left text-[12px]">
            <thead className="border-b border-white/10 bg-white/[.03] text-[10px] uppercase text-[var(--muted)]">
              <tr>
                <th className="p-2.5">Service</th>
                <th className="p-2.5">Account</th>
                <th className="p-2.5">Secret</th>
                <th className="p-2.5">2FA Code</th>
                <th className="p-2.5 w-28">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleAccounts.map((row) => (
                <tr key={row.id} className="border-t border-white/5 hover:bg-white/[.02]">
                  <td className="p-2.5 font-medium">{row.service}</td>
                  <td className="max-w-[12rem] truncate p-2.5 text-[var(--muted)]" title={row.account}>
                    {row.account}
                  </td>
                  <td className="max-w-[8rem] truncate p-2.5 font-mono text-[10px]" title={row.secret}>
                    {maskSecret(row.secret)}
                  </td>
                  <td className="p-2.5">
                    <CodeCell account={row} />
                  </td>
                  <td className="p-2.5">
                    <button type="button" className="btn-ghost btn mr-1 text-[10px]" onClick={() => startEdit(row)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn-ghost btn text-[10px] text-rose-300"
                      onClick={() => remove(row.id)}
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
