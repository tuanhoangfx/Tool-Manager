import { useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabase";

type Props = {
  onAuthed?: () => void;
};

export function NotesAuthGate({ onAuthed }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const action =
      mode === "signup"
        ? supabase.auth.signUp({ email, password })
        : supabase.auth.signInWithPassword({ email, password });
    const { error } = await action;
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    onAuthed?.();
  };

  return (
    <div className="mx-auto max-w-md rounded-xl border border-white/10 bg-white/[.03] p-6">
      <h2 className="mb-1 text-lg font-semibold">Đăng nhập để dùng Notes</h2>
      <p className="mb-4 text-[12px] text-[var(--muted)]">
        Notes lưu trên Supabase (cùng project Todo P0019). Chạy migration trong{" "}
        <code className="text-indigo-300">supabase/migrations/</code> nếu bảng chưa có.
      </p>
      <form className="space-y-3" onSubmit={(e) => void submit(e)}>
        <input
          className="field w-full text-[13px]"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="field w-full text-[13px]"
          type="password"
          placeholder="Mật khẩu"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {message ? <p className="text-[12px] text-rose-300">{message}</p> : null}
        <button type="submit" className="btn w-full text-[13px]" disabled={busy}>
          {busy ? "Đang xử lý…" : mode === "signin" ? "Đăng nhập" : "Đăng ký"}
        </button>
        <button
          type="button"
          className="btn-ghost btn w-full text-[12px]"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Chưa có tài khoản? Đăng ký" : "Đã có tài khoản? Đăng nhập"}
        </button>
      </form>
    </div>
  );
}
