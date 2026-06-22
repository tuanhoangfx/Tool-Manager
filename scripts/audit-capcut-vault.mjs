#!/usr/bin/env node
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
for (const p of [resolve(root, "../../.env.shared"), resolve(root, ".env.local")]) {
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!process.env[key]) process.env[key] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  }
}

const url = process.env.VITE_TWOFA_SUPABASE_URL;
const key = process.env.VITE_TWOFA_SUPABASE_ANON_KEY;
const email = process.argv[2] ?? "czpgo@outlook.com";
const password = process.argv[3] ?? "123123";
const probe = (process.argv[4] ?? "l1ip4@outlook.com").trim().toLowerCase();

const auth = await (
  await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
).json();

const token = auth.access_token;
const headers = { apikey: key, Authorization: `Bearer ${token}` };

let all = [];
let from = 0;
const pageSize = 1000;
for (;;) {
  const res = await fetch(
    `${url}/rest/v1/twofa_accounts?deleted_at=is.null&select=id,service,browser,account,secret,updated_at&order=id.asc&offset=${from}&limit=${pageSize}`,
    { headers },
  );
  const chunk = await res.json();
  if (!res.ok) {
    console.error(chunk);
    process.exit(1);
  }
  if (!chunk.length) break;
  all.push(...chunk);
  if (chunk.length < pageSize) break;
  from += pageSize;
}

console.log("Active rows on cloud:", all.length);

const capcutLike = all.filter((r) => /capcut/i.test(r.service ?? ""));
console.log("Capcut-like rows on cloud:", capcutLike.length);

const probeRows = all.filter((r) => (r.account ?? "").trim().toLowerCase() === probe);
console.log(`\nRows for account ${probe}:`, probeRows.length);
for (const r of probeRows) {
  console.log(
    `  ${r.service} id=${r.id.slice(0, 8)} browser=${JSON.stringify(r.browser ?? "")} secret=${r.secret ? "yes" : "no"}`,
  );
}

const byCapcutAccount = new Map();
for (const r of capcutLike) {
  const k = (r.account ?? "").trim().toLowerCase();
  if (!k) continue;
  const list = byCapcutAccount.get(k) ?? [];
  list.push(r);
  byCapcutAccount.set(k, list);
}

const multi = [...byCapcutAccount.entries()].filter(([, rows]) => rows.length > 1);
console.log(`\nCapcut accounts with >1 cloud row: ${multi.length}`);

const localOnlyCandidate = capcutLike.length;
console.log(`\nIf UI shows more Capcut than ${capcutLike.length}, extras are local-only ghosts.`);
