#!/usr/bin/env node
/**
 * Local dev quota API — probe + Cockpit import/sync (avoids CORS).
 * POST /api/quota-probe
 * POST /api/quota-cockpit-sync   { dataDir? }
 * POST /api/quota-cockpit-import { backup? }
 */
import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { probeVaultAccountQuota } from "./lib/quota-probes/index.mjs";
import { buildCockpitQuotaPatches, loadCockpitQuotaSources } from "./lib/cockpit-quota-import.mjs";
import { startCursorOAuth, completeCursorOAuth, cancelCursorOAuth } from "./lib/cursor-oauth.mjs";
import { upsertCockpitCursorAccount, refreshCockpitCursorAccount } from "./lib/cockpit-cursor-store.mjs";
import {
  startGeminiOAuth,
  completeGeminiOAuth,
  cancelGeminiOAuth,
  submitGeminiManualCallback,
} from "./lib/gemini-oauth.mjs";
import { upsertCockpitGeminiAccount } from "./lib/cockpit-gemini-store.mjs";
import { buildQuotaEnrollPatches, formatEnrollOutcome } from "./lib/quota-oauth-enroll.mjs";
import {
  startStealthQuotaEnroll,
  pollStealthQuotaEnroll,
  cancelStealthQuotaEnroll,
} from "./lib/quota-stealth-enroll.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const PORT = Number(process.env.P0020_QUOTA_PROBE_PORT || 5198);
const HOST = process.env.P0020_QUOTA_PROBE_HOST || "127.0.0.1";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!process.env[key]) process.env[key] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  }
}

loadEnvFile(resolve(root, "../../.env.shared"));
loadEnvFile(resolve(root, ".env.local"));

const url = process.env.VITE_TWOFA_SUPABASE_URL;
const key = process.env.VITE_TWOFA_SUPABASE_ANON_KEY;
const email = process.env.TWOFA_IMPORT_EMAIL ?? "czpgo@outlook.com";
const password = process.env.TWOFA_IMPORT_PASSWORD ?? "123123";

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(payload);
}

async function readBody(req) {
  let body = "";
  req.setEncoding("utf8");
  for await (const chunk of req) body += chunk;
  try {
    return JSON.parse(body || "{}");
  } catch {
    return null;
  }
}

async function signIn() {
  if (!url || !key) throw new Error("Missing VITE_TWOFA_SUPABASE_*");
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`auth ${res.status}`);
  return (await res.json()).access_token;
}

async function fetchVault(token) {
  const rows = [];
  let offset = 0;
  while (true) {
    const res = await fetch(
      `${url}/rest/v1/twofa_accounts?select=id,service,account,mail_recover,password,note,plan_package,plan_tier,quota_enrolled_at&deleted_at=is.null&order=id.asc&offset=${offset}&limit=500`,
      { headers: { apikey: key, Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) throw new Error(`vault fetch ${res.status}`);
    const page = await res.json();
    if (!page.length) break;
    rows.push(...page);
    if (page.length < 500) break;
    offset += 500;
  }
  return rows;
}

async function patchVaultRow(token, id, patch) {
  const body = { ...patch, updated_at: new Date().toISOString() };
  if (body.password === undefined) delete body.password;
  const res = await fetch(`${url}/rest/v1/twofa_accounts?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`patch ${id} ${res.status}`);
}

async function patchesToClient(patches, createdRows) {
  return [
    ...patches.map((p) => ({
      id: p.id,
      quotaEnrolledAt: p.quota_enrolled_at,
      quotaStatus: p.quota_status,
      planPackage: p.plan_package,
      planTier: p.plan_tier,
      quotaSnapshot: p.quota_snapshot,
      quotaCheckedAt: p.quota_checked_at,
      note: p.note,
      password: p.password,
    })),
    ...createdRows.map((row) => ({
      id: row.id,
      quotaEnrolledAt: row.quota_enrolled_at,
      quotaStatus: row.quota_status,
      planPackage: row.plan_package,
      planTier: row.plan_tier,
      quotaSnapshot: row.quota_snapshot,
      quotaCheckedAt: row.quota_checked_at,
      note: row.note,
      password: row.password,
    })),
  ];
}

async function applyQuotaVaultPatches(token, userId, patches, creates) {
  for (const patch of patches) {
    const { id, ...body } = patch;
    await patchVaultRow(token, id, body);
  }
  const createdRows = [];
  for (const draft of creates) {
    createdRows.push(await createVaultRow(token, userId, draft));
  }
  return patchesToClient(patches, createdRows);
}

async function enrollCockpitAccountToVault(platform, cockpitAccount) {
  const token = await signIn();
  const authUser = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
  const userId = authUser?.id;
  const vaultRows = await fetchVault(token);
  const { patches, creates, mapped } = buildQuotaEnrollPatches(vaultRows, platform, cockpitAccount);
  const clientPatches = await applyQuotaVaultPatches(token, userId, patches, creates);
  return formatEnrollOutcome(clientPatches, creates, mapped);
}

async function handleCockpitImport(parsed, { backupOnly = false } = {}) {
  const platforms = Array.isArray(parsed?.platforms) ? parsed.platforms : undefined;
  const cockpitAccounts = backupOnly
    ? loadCockpitQuotaSources({ backupJson: parsed?.backup, platforms })
    : loadCockpitQuotaSources({ dataDir: parsed?.dataDir, backupJson: parsed?.backup, platforms });
  const token = await signIn();
  const authUser = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
  const userId = authUser?.id;
  const vaultRows = await fetchVault(token);
  const { patches, creates, unmatched } = buildCockpitQuotaPatches(vaultRows, cockpitAccounts);

  for (const patch of patches) {
    const { id, ...body } = patch;
    await patchVaultRow(token, id, body);
  }

  const createdRows = [];
  for (const draft of creates) {
    const row = await createVaultRow(token, userId, draft);
    createdRows.push(row);
  }

  const allPatches = await patchesToClient(patches, createdRows);

  return {
    cockpitCount: cockpitAccounts.length,
    matched: patches.length,
    created: createdRows.length,
    skipped: unmatched.length,
    accounts: cockpitAccounts.map((a) => ({
      email: a.email,
      platform: a.cockpitPlatform,
      quotaStatus: a.quotaStatus,
      metrics: a.quotaSnapshot?.metrics ?? [],
    })),
    unmatched: unmatched.map((row) => ({ email: row.email, platform: row.cockpitPlatform })),
    patches: allPatches,
  };
}

async function createVaultRow(token, userId, draft) {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const body = {
    id,
    user_id: userId,
    service: draft.service,
    browser: null,
    account: draft.account,
    mail_recover: null,
    password: draft.password ?? null,
    secret: draft.secret ?? "",
    note: draft.note ?? null,
    status: draft.status ?? "active",
    ownership: draft.ownership ?? "undefined",
    plan_package: draft.plan_package ?? null,
    plan_tier: draft.plan_tier ?? null,
    quota_snapshot: draft.quota_snapshot ?? null,
    quota_checked_at: draft.quota_checked_at ?? null,
    quota_status: draft.quota_status ?? null,
    quota_enrolled_at: draft.quota_enrolled_at ?? null,
    log: [],
    created_at: now,
    updated_at: now,
    last_used_at: null,
  };
  const res = await fetch(`${url}/rest/v1/twofa_accounts`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`create ${draft.account} ${res.status}`);
  const row = await res.json();
  return Array.isArray(row) ? row[0] : row;
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (req.method !== "POST" || !req.url?.startsWith("/api/")) {
    sendJson(res, 404, { error: "Not found" });
    return;
  }

  const parsed = await readBody(req);
  if (!parsed) {
    sendJson(res, 400, { error: "Invalid JSON" });
    return;
  }

  try {
    if (req.url.startsWith("/api/quota-probe")) {
      const accounts = Array.isArray(parsed.accounts) ? parsed.accounts : [];
      const results = [];
      for (const row of accounts) {
        if (!row?.id) continue;
        const outcome = await probeVaultAccountQuota(row);
        results.push({
          id: row.id,
          quotaStatus: outcome.quotaStatus,
          quotaSnapshot: outcome.snapshot,
          quotaCheckedAt: new Date().toISOString(),
          planTier: outcome.snapshot?.tierLabel ?? undefined,
          planPackage: outcome.snapshot?.planLabel ?? undefined,
        });
      }
      sendJson(res, 200, { results });
      return;
    }

    if (req.url.startsWith("/api/quota-cockpit-sync")) {
      const outcome = await handleCockpitImport(parsed);
      sendJson(res, 200, outcome);
      return;
    }

    if (req.url.startsWith("/api/quota-cockpit-import")) {
      const outcome = await handleCockpitImport(parsed, { backupOnly: true });
      sendJson(res, 200, outcome);
      return;
    }

    if (req.url.startsWith("/api/quota-stealth-enroll/start")) {
      const platform = parsed.platform === "gemini" ? "gemini" : "cursor";
      const profileName = String(parsed.profileName ?? parsed.profile ?? "0069").trim();
      const outcome = await startStealthQuotaEnroll(platform, profileName);
      sendJson(res, 200, outcome);
      return;
    }

    if (req.url.startsWith("/api/quota-stealth-enroll/poll")) {
      const platform = parsed.platform === "gemini" ? "gemini" : "cursor";
      const loginId = parsed.loginId ?? parsed.login_id;
      if (!loginId) {
        sendJson(res, 400, { error: "loginId required" });
        return;
      }
      const outcome = await pollStealthQuotaEnroll(platform, loginId, enrollCockpitAccountToVault);
      if (!outcome) {
        sendJson(res, 202, { pending: true });
        return;
      }
      sendJson(res, 200, { ...outcome, patches: outcome.patches });
      return;
    }

    if (req.url.startsWith("/api/quota-stealth-enroll/cancel")) {
      const platform = parsed.platform === "gemini" ? "gemini" : "cursor";
      cancelStealthQuotaEnroll(platform, parsed.loginId ?? parsed.login_id);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.url.startsWith("/api/quota-stealth-open")) {
      const { openStealthUrl } = await import("../../scripts/lib/stealth-browser-client.mjs");
      const profileName = String(parsed.profileName ?? parsed.profile ?? "0069").trim();
      const targetUrl = String(parsed.targetUrl ?? "https://www.cursor.com/settings").trim();
      const result = await openStealthUrl({
        profileName,
        targetUrl,
        closeWhenDone: false,
      });
      sendJson(res, 200, { ok: true, profileName, targetUrl, result });
      return;
    }

    if (req.url.startsWith("/api/quota-oauth/cursor/start")) {
      sendJson(res, 200, startCursorOAuth());
      return;
    }

    if (req.url.startsWith("/api/quota-oauth/cursor/cancel")) {
      cancelCursorOAuth(parsed.loginId ?? parsed.login_id);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.url.startsWith("/api/quota-oauth/cursor/complete")) {
      const loginId = parsed.loginId ?? parsed.login_id;
      const oauthPayload = await completeCursorOAuth(loginId);
      let account = upsertCockpitCursorAccount(oauthPayload);
      account = await refreshCockpitCursorAccount(account);
      const outcome = await enrollCockpitAccountToVault("cursor", account);
      sendJson(res, 200, { ...outcome, patches: outcome.patches });
      return;
    }

    if (req.url.startsWith("/api/quota-oauth/gemini/start")) {
      const start = await startGeminiOAuth();
      sendJson(res, 200, start);
      return;
    }

    if (req.url.startsWith("/api/quota-oauth/gemini/cancel")) {
      cancelGeminiOAuth(parsed.loginId ?? parsed.login_id);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.url.startsWith("/api/quota-oauth/gemini/manual")) {
      submitGeminiManualCallback(parsed.loginId ?? parsed.login_id, parsed.callbackUrl ?? parsed.callback ?? "");
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.url.startsWith("/api/quota-oauth/gemini/complete")) {
      const loginId = parsed.loginId ?? parsed.login_id;
      const oauthPayload = await completeGeminiOAuth(loginId);
      const account = upsertCockpitGeminiAccount(oauthPayload);
      const outcome = await enrollCockpitAccountToVault("gemini", account);
      sendJson(res, 200, { ...outcome, patches: outcome.patches });
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    sendJson(res, 500, { error: message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`P0020 quota API http://${HOST}:${PORT} (probe + cockpit sync)`);
});
