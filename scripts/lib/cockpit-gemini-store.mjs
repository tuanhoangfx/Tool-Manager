import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { resolveCockpitDataDir } from "./cockpit-quota-import.mjs";

const INDEX_FILE = "gemini_accounts.json";
const DETAIL_DIR = "gemini_accounts";

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function buildAccountId(email, authId) {
  const seed = (authId ?? email ?? "gemini_user").toString().toLowerCase();
  return `gemini_${crypto.createHash("md5").update(seed).digest("hex")}`;
}

function loadIndex(dataDir) {
  return readJson(path.join(dataDir, INDEX_FILE), { version: "1.0", accounts: [] });
}

function saveIndex(dataDir, index) {
  writeJson(path.join(dataDir, INDEX_FILE), index);
}

function loadDetail(dataDir, id) {
  return readJson(path.join(dataDir, DETAIL_DIR, `${id}.json`), null);
}

function saveDetail(dataDir, account) {
  writeJson(path.join(dataDir, DETAIL_DIR, `${account.id}.json`), account);
}

function refreshSummary(index, account) {
  const summary = {
    id: account.id,
    email: account.email,
    auth_id: account.auth_id ?? null,
    plan_name: account.plan_name ?? null,
    tier_id: account.tier_id ?? null,
    created_at: account.created_at,
    last_used: account.last_used,
  };
  const idx = index.accounts.findIndex((row) => row.id === account.id);
  if (idx >= 0) index.accounts[idx] = summary;
  else index.accounts.push(summary);
}

export function upsertCockpitGeminiAccount(payload, dataDir = resolveCockpitDataDir()) {
  ensureDir(path.join(dataDir, DETAIL_DIR));
  const index = loadIndex(dataDir);
  const incomingAuth = payload.auth_id ?? null;
  const incomingEmail = (payload.email ?? "").trim().toLowerCase();

  let accountId = buildAccountId(payload.email, payload.auth_id);
  for (const item of index.accounts) {
    const existing = loadDetail(dataDir, item.id);
    if (!existing) continue;
    if (incomingAuth && existing.auth_id === incomingAuth) {
      accountId = existing.id;
      break;
    }
    if (incomingEmail && existing.email?.toLowerCase() === incomingEmail) {
      accountId = existing.id;
      break;
    }
  }

  const existing = loadDetail(dataDir, accountId);
  const now = nowSec();
  const account = {
    ...(existing ?? {}),
    id: accountId,
    email: payload.email || existing?.email || "",
    auth_id: payload.auth_id ?? existing?.auth_id ?? null,
    name: payload.name ?? existing?.name ?? null,
    access_token: payload.access_token,
    refresh_token: payload.refresh_token ?? existing?.refresh_token ?? null,
    id_token: payload.id_token ?? existing?.id_token ?? null,
    token_type: payload.token_type ?? existing?.token_type ?? null,
    scope: payload.scope ?? existing?.scope ?? null,
    expiry_date: payload.expiry_date ?? existing?.expiry_date ?? null,
    gemini_auth_raw: payload.gemini_auth_raw ?? existing?.gemini_auth_raw ?? null,
    gemini_usage_raw: payload.gemini_usage_raw ?? existing?.gemini_usage_raw ?? null,
    plan_name: payload.plan_name ?? existing?.plan_name ?? null,
    tier_id: payload.tier_id ?? existing?.tier_id ?? null,
    usage_updated_at: payload.usage_updated_at ?? existing?.usage_updated_at ?? null,
    created_at: existing?.created_at ?? now,
    last_used: now,
  };

  saveDetail(dataDir, account);
  refreshSummary(index, account);
  saveIndex(dataDir, index);
  return account;
}
