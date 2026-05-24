#!/usr/bin/env node
/**
 * Full cookie-bridge smoke: schema (4/4) + vault fetch RPC (read-only).
 * Optional: P0020_PROBE_NOTE_ID in .env.local for real-note vault fetch.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const node = process.execPath;

function run(script, args = []) {
  const r = spawnSync(node, [resolve(root, "scripts", script), ...args], {
    cwd: root,
    stdio: "inherit",
    encoding: "utf8",
  });
  return r.status ?? 1;
}

let code = run("verify-p0020-schema.mjs");
if (code !== 0) process.exit(code);

const envPath = resolve(root, ".env.local");
let probeNoteId = process.env.P0020_PROBE_NOTE_ID?.trim();
if (!probeNoteId) {
  try {
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.trim().match(/^P0020_PROBE_NOTE_ID=(.*)$/);
      if (m) probeNoteId = m[1].replace(/^["']|["']$/g, "").trim();
    }
  } catch {
    /* no .env.local */
  }
}

if (probeNoteId) {
  console.log("\n--- vault fetch (real note) ---\n");
  code = run("verify-extension-load-flow.mjs", [probeNoteId]);
} else {
  console.log("\n--- vault fetch RPC (anon probe, read-only) ---\n");
  const env = {};
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_ANON_KEY;
  const fakeId = "00000000-0000-0000-0000-000000000000";
  const res = await fetch(`${url}/rest/v1/rpc/note_vault_fetch`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_note_id: fakeId,
      p_domain: ".probe",
      p_pass: null,
    }),
  });
  const body = await res.text();
  console.log("note_vault_fetch", res.status, body.slice(0, 120));
  if (/record\s+"v_note"|sync_pass_hash/i.test(body)) {
    console.error("FAIL: stale DB functions");
    code = 2;
  } else if (/PGRST202|does not exist/i.test(body)) {
    console.error("FAIL: note_vault_fetch missing");
    code = 2;
  } else {
    console.log("OK: note_vault_fetch RPC reachable");
    code = 0;
  }
  console.log("\nTip: set P0020_PROBE_NOTE_ID=<note-uuid> in .env.local for full load-flow check.");
}

process.exit(code);
