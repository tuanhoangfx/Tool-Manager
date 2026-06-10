import toolManifest from "../../../tool.manifest.json";

export type CookieSchemaCheck = {
  name: string;
  ok: boolean;
  detail?: string;
};

export type CookieSchemaHealth = {
  ok: boolean;
  checks: CookieSchemaCheck[];
  fixHint: string;
};

const FIX_HINT =
  (toolManifest.supabase?.localEnv?.note as string | undefined) ??
  "Chạy supabase/APPLY_ALL_P0020_COOKIE_BRIDGE.sql trong Supabase SQL Editor, đợi ~30s, reload extension.";

function rpcMissing(body: string) {
  return /PGRST202|Could not find the function|does not exist in the schema cache/i.test(body);
}

/** Same probes as scripts/verify-p0020-schema.mjs (anon REST, not supabase.rpc). */
async function rpcProbe(name: string, body: Record<string, unknown>) {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const res = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.text() };
}

export async function probeCookieSchemaHealth(): Promise<CookieSchemaHealth> {
  const fakeId = "00000000-0000-0000-0000-000000000000";
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  const [vaultProbe, syncByNote, setPass, tableRes] = await Promise.all([
    rpcProbe("note_vault_upsert", {
      p_note_id: fakeId,
      p_domain: ".test",
      p_pass: null,
      p_ciphertext: "dGVzdA==",
      p_iv: "dGVzdA==",
      p_cookie_count: 0,
      p_source_browser: "schema-health",
    }),
    rpcProbe("note_sync_cookies_by_note_id", {
      p_note_id: fakeId,
      p_pass: null,
      p_snapshot: [],
      p_domain: ".test",
    }),
    rpcProbe("note_set_sync_pass", {
      p_note_id: fakeId,
      p_pass: null,
    }),
    fetch(`${url}/rest/v1/note_cookie_vault?select=note_id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    }),
  ]);

  const staleVNote = /record\s+"v_note"\s+has\s+no\s+field/i.test(vaultProbe.body);
  const missingPassCol =
    /sync_pass_hash/i.test(vaultProbe.body) && !/note not found/i.test(vaultProbe.body);
  const vaultRpcOk = !staleVNote && !missingPassCol && !rpcMissing(vaultProbe.body);

  const checks: CookieSchemaCheck[] = [
    {
      name: "sync_pass_hash / note_verify_sync_pass",
      ok: vaultRpcOk,
      detail: staleVNote
        ? "OLD DB functions — run supabase/APPLY_FIX_V_NOTE_DROP.sql"
        : missingPassCol
          ? vaultProbe.body.slice(0, 120)
          : vaultProbe.body.slice(0, 60) || "ok",
    },
    {
      name: "note_sync_cookies_by_note_id",
      ok: !rpcMissing(syncByNote.body),
      detail: `${syncByNote.status} ${syncByNote.body.slice(0, 80)}`,
    },
    {
      name: "note_set_sync_pass",
      ok: !rpcMissing(setPass.body),
      detail: `${setPass.status} ${setPass.body.slice(0, 80)}`,
    },
    {
      name: "note_cookie_vault",
      ok: tableRes.ok,
      detail: String(tableRes.status),
    },
  ];

  return { ok: checks.every((c) => c.ok), checks, fixHint: FIX_HINT };
}
