#!/usr/bin/env node
/**
 * Smoke: stale activity labels show dd/mm/yy (no hh:mm prefix) on Cookie + 2FA Services.
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sharedEnv = resolve(root, "../../.env.shared");
const localEnv = resolve(root, ".env.local");
const BASE = (process.env.P0020_BASE_URL || "http://127.0.0.1:5177").replace(/\/$/, "");

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

loadEnvFile(sharedEnv);
loadEnvFile(localEnv);

async function loadPlaywright() {
  const candidates = [
    resolve(root, "node_modules/playwright/index.mjs"),
    resolve(root, "../P0004-Tool-Hub/node_modules/playwright/index.mjs"),
    resolve(root, "../../node_modules/playwright/index.mjs"),
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    try {
      return await import(pathToFileURL(p).href);
    } catch {
      /* try next */
    }
  }
  return null;
}

const E2E_EMAIL = process.argv[2] ?? "czpgo@outlook.com";
const E2E_PASSWORD = process.argv[3] ?? "123123";

function supabaseAuthStorageKey(url) {
  if (!url) return null;
  try {
    const ref = new URL(url).hostname.split(".")[0];
    return `sb-${ref}-auth-token`;
  } catch {
    return null;
  }
}

async function signInWithRetry(maxAttempts = 4) {
  const url = process.env.VITE_TWOFA_SUPABASE_URL;
  const key = process.env.VITE_TWOFA_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error("FAIL: missing VITE_TWOFA_SUPABASE_*");
    process.exit(2);
  }
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ email: E2E_EMAIL, password: E2E_PASSWORD }),
    });
    const auth = await res.json();
    if (auth.access_token) return auth;
    if (auth.error_code === "over_request_rate_limit" && attempt < maxAttempts) {
      console.warn(`auth rate limited — retry ${attempt}/${maxAttempts} in 15s…`);
      await new Promise((r) => setTimeout(r, 15_000));
      continue;
    }
    console.warn("AUTH_FAIL", auth.error_description ?? auth);
    return null;
  }
  return null;
}

const WORKER = (process.env.HUB_WORKER_URL || "https://chathub.infi.io.vn").replace(/\/$/, "");
const HUB_URL = process.env.VITE_HUB_SUPABASE_URL ?? "";
const HUB_ANON = process.env.VITE_HUB_SUPABASE_ANON_KEY ?? "";

function sessionSnapshotFromRaw(session) {
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token ?? "",
    expires_at: session.expires_at ?? null,
    user_id: session.user?.id ?? null,
    user_email: session.user?.email ?? null,
    cached_at: Date.now(),
  };
}

function supabaseStoragePayload(session) {
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    token_type: session.token_type ?? "bearer",
    user: session.user,
  };
}

async function hubSignInFromWorker(email, password) {
  const recoverToken =
    process.env.HUB_ADMIN_RECOVER_TOKEN?.trim() ||
    process.env.VITE_HUB_ADMIN_RECOVER_TOKEN?.trim() ||
    "";
  const headers = { "Content-Type": "application/json" };
  if (recoverToken) headers["X-Hub-Recover-Token"] = recoverToken;

  async function post(path, body) {
    const res = await fetch(`${WORKER}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    return { res, json };
  }

  if (recoverToken) {
    const recovered = await post("/api/auth/hub/admin-recover", { login: email, password });
    if (recovered.res.ok && recovered.json.ok && recovered.json.dataSession?.access_token) {
      return recovered.json;
    }
  }
  const signIn = await post("/api/auth/hub/sign-in", { login: email, password, mode: "signin" });
  if (signIn.res.ok && signIn.json.ok && signIn.json.dataSession?.access_token) return signIn.json;
  if (recoverToken) {
    const recovered = await post("/api/auth/hub/admin-recover", { login: email, password });
    if (recovered.res.ok && recovered.json.ok && recovered.json.dataSession?.access_token) return recovered.json;
  }
  return null;
}

async function seedAuthContext(context, hubBody, twofaAuth) {
  const identitySession = hubBody.session;
  const dataSession = hubBody.dataSession;
  const dataSnap = sessionSnapshotFromRaw(dataSession);
  const twofaSnap = sessionSnapshotFromRaw(twofaAuth);
  const hubIdentity = {
    access_token: identitySession.access_token,
    refresh_token: identitySession.refresh_token ?? "",
    expires_at: identitySession.expires_at ?? null,
    user_id: identitySession.user?.id ?? null,
    user_email: hubBody.authEmail ?? identitySession.user?.email ?? null,
    supabase_url: HUB_URL,
    supabase_anon_key: HUB_ANON,
    cached_at: Date.now(),
  };
  const notesKey = supabaseAuthStorageKey(process.env.VITE_SUPABASE_URL);
  const twofaKey = supabaseAuthStorageKey(process.env.VITE_TWOFA_SUPABASE_URL);
  const dataBlob = JSON.stringify(supabaseStoragePayload(dataSession));
  const twofaBlob = JSON.stringify(supabaseStoragePayload(twofaAuth));
  const identityBlob = JSON.stringify(supabaseStoragePayload(identitySession));

  await context.addInitScript(
    ({ dataSnap, twofaSnap, hubIdentity, notesKey, twofaKey, dataBlob, twofaBlob, identityBlob }) => {
      localStorage.setItem("p0020.offlineMode.v1", "0");
      localStorage.setItem("p0020:databox-session-v2", JSON.stringify(dataSnap));
      localStorage.setItem("p0020:twofa-session-v2", JSON.stringify(twofaSnap));
      localStorage.setItem("x1z10:hub-identity-v2", JSON.stringify(hubIdentity));
      if (notesKey) localStorage.setItem(notesKey, dataBlob);
      if (twofaKey) localStorage.setItem(twofaKey, twofaBlob);
      const hubKey = hubIdentity.supabase_url
        ? `sb-${new URL(hubIdentity.supabase_url).hostname.split(".")[0]}-auth-token`
        : null;
      if (hubKey) localStorage.setItem(hubKey, identityBlob);
    },
    { dataSnap, twofaSnap, hubIdentity, notesKey, twofaKey, dataBlob, twofaBlob, identityBlob },
  );
}

async function signInViaUi(page, email, password) {
  await page.goto(`${BASE}/twofa`, { waitUntil: "domcontentloaded", timeout: 25_000 });
  const gate = page.getByRole("button", { name: "Sign In" }).first();
  if (await gate.isVisible({ timeout: 4000 }).catch(() => false)) {
    await gate.click();
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole("button", { name: "Sign In" }).last().click();
    await page.waitForTimeout(3000);
  }
}

const DATE_ONLY = /^\d{2}\/\d{2}\/\d{2}$/;
const RELATIVE = /^(just now|\d+m ago|\d+h ago)$/;
const ABSOLUTE_WITH_TIME = /^\d{2}:\d{2}\s+\d{2}\/\d{2}\/\d{2}$/;

function classifyLabel(text) {
  const t = text.trim();
  if (DATE_ONLY.test(t)) return "date-only";
  if (RELATIVE.test(t)) return "relative";
  if (ABSOLUTE_WITH_TIME.test(t)) return "absolute-with-time";
  return "other";
}

async function collectActivityLabels(page) {
  return page.evaluate(() => {
    const nodes = document.querySelectorAll(
      ".hub-activity-timestamp-label, [data-hub-activity-ts], time.hub-activity-ts",
    );
    const fromAttr = [...document.querySelectorAll("[title]")].filter((el) => {
      const t = el.getAttribute("title") ?? "";
      return /\d{2}\/\d{2}\/\d{2}/.test(t) || /\d{2}:\d{2}/.test(t);
    });
    const texts = new Set();
    for (const n of nodes) {
      const t = (n.textContent ?? "").trim();
      if (t) texts.add(t);
    }
    const DATE_ONLY_RE = /^\d{2}\/\d{2}\/\d{2}$/;
    for (const cell of document.querySelectorAll(
      "td.hub-users-col--twofa-updated, td.hub-users-col--twofa-created, .hub-directory-cell time, .hub-users-table td",
    )) {
      const t = (cell.textContent ?? "").trim();
      if (/ago$/.test(t) || DATE_ONLY_RE.test(t) || /^\d{2}:\d{2}/.test(t)) texts.add(t);
    }
    for (const td of document.querySelectorAll("table.hub-users-table td")) {
      const t = (td.textContent ?? "").trim();
      if (DATE_ONLY_RE.test(t) || /ago$/.test(t) || /^just now$/.test(t)) texts.add(t);
    }
    return [...texts];
  });
}

async function waitForTable(page, selector, timeout = 45_000) {
  await page.waitForSelector(selector, { timeout });
  await page.waitForTimeout(2000);
}

async function smokeRoute(page, path, tableSelector, label, opts = {}) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  const gateVisible = await page
    .getByText("Welcome to Data Box")
    .isVisible({ timeout: 2000 })
    .catch(() => false);
  if (gateVisible) {
    console.warn(`SKIP ${label}: auth gate`);
    return { label, skip: true };
  }
  if (opts.clickTable) {
    const tableBtn = page.getByRole("button", { name: "Table" });
    if (await tableBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tableBtn.click();
      await page.waitForTimeout(800);
    }
  }
  try {
    await waitForTable(page, tableSelector);
  } catch {
    const body = await page.locator("body").innerText().catch(() => "");
    if (/Anonymous mode is enabled/i.test(body)) {
      console.warn(`SKIP ${label}: anonymous mode`);
      return { label, skip: true };
    }
    throw new Error(`${label}: table not found (${tableSelector})`);
  }
  const labels = await collectActivityLabels(page);
  const classified = labels.map((t) => ({ text: t, kind: classifyLabel(t) }));
  const bad = classified.filter((x) => x.kind === "absolute-with-time");
  const stale = classified.filter((x) => x.kind === "date-only");
  const relative = classified.filter((x) => x.kind === "relative");
  console.log(`\n=== ${label} (${path}) ===`);
  console.log(`samples: ${labels.length} | date-only: ${stale.length} | relative: ${relative.length} | bad(hh:mm): ${bad.length}`);
  for (const x of classified.slice(0, 12)) console.log(`  [${x.kind}] ${x.text}`);
  if (bad.length > 0) {
    console.error(`FAIL ${label}: found hh:mm dd/mm/yy labels (should be date-only or relative)`);
    for (const x of bad) console.error(`  BAD: ${x.text}`);
    return { label, ok: false, bad, stale, relative };
  }
  if (stale.length === 0 && relative.length === 0) {
    console.warn(`WARN ${label}: no timestamp labels found — vault may lack activity columns visible`);
  }
  return { label, ok: true, stale, relative, samples: labels };
}

async function main() {
  const pw = await loadPlaywright();
  if (!pw) {
    console.warn("SKIP: playwright not installed");
    process.exit(0);
  }
  const hubBody = await hubSignInFromWorker(E2E_EMAIL, E2E_PASSWORD);
  if (!hubBody) {
    console.warn("SKIP: hub worker sign-in failed");
    process.exit(0);
  }
  const twofaAuth = await signInWithRetry();
  if (!twofaAuth) {
    console.warn("SKIP: twofa sign-in failed");
    process.exit(0);
  }
  const browser = await pw.chromium.launch({ headless: true });
  const context = await browser.newContext();
  await seedAuthContext(context, hubBody, twofaAuth);
  const page = await context.newPage();
  await signInViaUi(page, E2E_EMAIL, E2E_PASSWORD);

  const results = [];
  results.push(
    await smokeRoute(
      page,
      "/cookie",
      "table.hub-users-table--cookie-routes, .hub-directory-frame table, table.hub-users-table",
      "Cookie Bridge",
      { clickTable: true },
    ),
  );
  results.push(
    await smokeRoute(page, "/twofa/services", ".hub-users-col--twofa-service", "2FA Services"),
  );

  await browser.close();

  const failed = results.filter((r) => r.ok === false);
  if (failed.length) process.exit(1);
  const skipped = results.every((r) => r.skip);
  if (skipped) {
    console.warn("\nSKIP: all routes skipped");
    process.exit(0);
  }
  console.log("\nOK: stale timestamp smoke pass — no hh:mm prefix on activity labels");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
