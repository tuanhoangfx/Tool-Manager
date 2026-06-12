#!/usr/bin/env node
/**
 * Production smoke: Hub worker sign-in returns dataSession + DataBox vault RPC is reachable.
 *
 * Usage:
 *   node scripts/smoke-databox-hub-auth.mjs
 *   node scripts/smoke-databox-hub-auth.mjs --worker https://chathub.infi.io.vn
 *
 * Credentials (first match wins):
 *   SMOKE_DATABOX_EMAIL / SMOKE_DATABOX_PASSWORD
 *   argv[email] argv[password]
 *   .env.local VITE_SMOKE_* or smoke-twofa defaults via loadEnvLocal
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sharedEnvPath = path.resolve(root, "../../.env.shared");

function parseArgs(argv) {
  const opts = { worker: "https://chathub.infi.io.vn" };
  const positional = [];
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--worker" && argv[i + 1]) {
      opts.worker = argv[++i].replace(/\/$/, "");
    } else if (a === "--origin" && argv[i + 1]) {
      i += 1;
    } else if (a.startsWith("--")) {
      continue;
    } else {
      positional.push(a);
    }
  }
  return { ...opts, email: positional[0], password: positional[1] };
}

function loadEnvFile(filePath) {
  const map = {};
  if (!fs.existsSync(filePath)) return map;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    map[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  }
  return map;
}

const local = loadEnvFile(path.join(root, ".env.local"));
const shared = loadEnvFile(sharedEnvPath);
const p0016Local = loadEnvFile(path.resolve(root, "../P0016-ChatCenter/.env.local"));
const env = { ...shared, ...p0016Local, ...local, ...process.env };

const opts = parseArgs(process.argv);
const email =
  env.SMOKE_DATABOX_EMAIL?.trim() ||
  opts.email ||
  env.VITE_SMOKE_EMAIL?.trim() ||
  "czpgo@outlook.com";
const password =
  env.SMOKE_DATABOX_PASSWORD?.trim() ||
  opts.password ||
  env.VITE_SMOKE_PASSWORD?.trim() ||
  "123123";

const databoxUrl = (
  env.DATABOX_SUPABASE_URL ||
  env.VITE_SUPABASE_URL ||
  "https://bklxcjrkhrevdcqjscku.supabase.co"
).replace(/\/$/, "");
const databoxAnon =
  env.DATABOX_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || "";
const recoverToken =
  env.HUB_ADMIN_RECOVER_TOKEN?.trim() ||
  env.VITE_HUB_ADMIN_RECOVER_TOKEN?.trim() ||
  "";

if (!databoxAnon) {
  console.error("smoke-databox-hub-auth: missing DATABOX/VITE_SUPABASE_ANON_KEY");
  process.exit(1);
}

const smokeHeaders = {
  "Content-Type": "application/json",
  "User-Agent": "DevWorkspace-Smoke/1.0",
};

async function hubAuthPost(path, body, extraHeaders = {}) {
  const res = await fetch(`${opts.worker}${path}`, {
    method: "POST",
    headers: { ...smokeHeaders, ...extraHeaders },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function tryAdminRecover() {
  if (!recoverToken) {
    console.warn("smoke-databox-hub-auth: no HUB_ADMIN_RECOVER_TOKEN — sign-in only");
    return null;
  }
  const recovered = await hubAuthPost(
    "/api/auth/hub/admin-recover",
    { login: email, password },
    { "x-hub-recover-token": recoverToken },
  );
  if (recovered.res.ok && recovered.json.ok) return recovered.json;
  console.warn(
    "smoke-databox-hub-auth: admin-recover failed",
    recovered.res.status,
    recovered.json.error ?? recovered.json,
  );
  return null;
}

let signInBody = await tryAdminRecover();
let signInVia = signInBody ? "admin-recover" : "sign-in";

if (!signInBody) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    const { res, json } = await hubAuthPost("/api/auth/hub/sign-in", {
      login: email,
      password,
      mode: "signin",
    });
    if (res.ok && json.ok) {
      signInBody = json;
      signInVia = "sign-in";
      break;
    }
    const rateLimited = res.status === 429 || Boolean(json.rateLimited);
    const recovered = await tryAdminRecover();
    if (recovered) {
      signInBody = recovered;
      signInVia = "admin-recover";
      break;
    }
    if (attempt < 5 && rateLimited) {
      await wait(3000 * attempt);
      continue;
    }
    console.error(
      "HUB_SIGNIN_FAIL",
      res.status,
      json.error ?? json,
      recoverToken ? "" : "(no recover token)",
    );
    process.exit(2);
  }
}

if (!signInBody?.ok) {
  console.error("HUB_SIGNIN_FAIL", "no session after retries");
  process.exit(2);
}

const dataToken = signInBody.dataSession?.access_token;
if (!dataToken) {
  console.error("DATA_SESSION_MISSING", {
    dataBoxError: signInBody.dataBoxError ?? null,
    hasSession: Boolean(signInBody.session?.access_token),
  });
  process.exit(3);
}

console.log("HUB_SIGNIN_OK", {
  worker: opts.worker,
  via: signInVia,
  email: signInBody.authEmail ?? email,
  dataSession: Boolean(dataToken),
  dataBoxError: signInBody.dataBoxError ?? null,
});

const rpcRes = await fetch(`${databoxUrl}/rest/v1/rpc/note_cookie_vault_summaries_accessible`, {
  method: "POST",
  headers: {
    apikey: databoxAnon,
    Authorization: `Bearer ${dataToken}`,
    "Content-Type": "application/json",
  },
  body: "{}",
});

const rpcBody = await rpcRes.json().catch(() => null);
if (!rpcRes.ok) {
  console.error("VAULT_RPC_FAIL", rpcRes.status, rpcBody);
  process.exit(4);
}

const count = Array.isArray(rpcBody) ? rpcBody.length : 0;
console.log("VAULT_RPC_OK", { rows: count, url: databoxUrl });
process.exit(0);
