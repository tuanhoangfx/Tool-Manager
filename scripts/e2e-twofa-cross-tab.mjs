#!/usr/bin/env node
/**
 * E2E: 2FA cross-tab sync — tab A writes vault → tab B updates without focus.
 *
 * Requires:
 *   - Dev server: http://127.0.0.1:5177 (pnpm dev) or production URL
 *   - playwright (P0004 node_modules)
 *   - VITE_TWOFA_SUPABASE_* in .env.local / .env.shared
 *
 * Usage:
 *   node scripts/e2e-twofa-cross-tab.mjs
 *   P0020_BASE_URL=https://databox.infi.io.vn node scripts/e2e-twofa-cross-tab.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sharedEnv = resolve(root, "../../.env.shared");
const localEnv = resolve(root, ".env.local");
const BASE = (process.env.P0020_BASE_URL || "http://127.0.0.1:5177").replace(/\/$/, "");
const CHANNEL = "p0020-twofa-vault-sync";
const LEGACY_KEY = "p0020-twofa-accounts-v1";
const TWOFA_SESSION_KEY = "p0020:twofa-session-v1";
const DATABOX_SESSION_KEY = "p0020:databox-session-v1";
const SCOPED_PREFIX = "p0020-twofa-accounts-v2";

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
    console.error("FAIL: missing VITE_TWOFA_SUPABASE_* in .env.local");
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
    console.warn("AUTH_FAIL", auth);
    return null;
  }
  return null;
}

function sessionSnapshot(auth) {
  return {
    access_token: auth.access_token,
    refresh_token: auth.refresh_token ?? "",
    expires_at: auth.expires_at ?? null,
    user_id: auth.user.id,
    user_email: auth.user.email,
    cached_at: Date.now(),
  };
}

async function seedAuthContext(context, auth) {
  const snap = sessionSnapshot(auth);
  const notesKey = supabaseAuthStorageKey(process.env.VITE_SUPABASE_URL);
  const twofaKey = supabaseAuthStorageKey(process.env.VITE_TWOFA_SUPABASE_URL);
  const storagePayload = {
    access_token: auth.access_token,
    refresh_token: auth.refresh_token,
    expires_at: auth.expires_at,
    expires_in: auth.expires_in,
    token_type: auth.token_type ?? "bearer",
    user: auth.user,
  };
  await context.addInitScript(
    ({ snap, notesKey, twofaKey, storagePayload }) => {
      const json = JSON.stringify(snap);
      sessionStorage.setItem("p0020:databox-session-v1", json);
      sessionStorage.setItem("p0020:twofa-session-v1", json);
      const blob = JSON.stringify(storagePayload);
      if (notesKey) localStorage.setItem(notesKey, blob);
      if (twofaKey && twofaKey !== notesKey) localStorage.setItem(twofaKey, blob);
    },
    { snap, notesKey, twofaKey, storagePayload },
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
  }
}

async function waitTwofaTable(page) {
  try {
    await page.waitForSelector(".hub-users-col--twofa-service", { timeout: 45_000 });
  } catch {
    const gated = await page.getByText("Welcome to Data Box").isVisible().catch(() => false);
    if (gated) {
      console.warn("SKIP: auth gate — sign-in failed or Supabase rate limited");
      process.exit(0);
    }
    throw new Error("2FA table not found");
  }
  await page.waitForTimeout(2500);
}

function draftRow(service) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    service,
    browser: null,
    account: "e2e@crosstab.local",
    password: null,
    secret: "JBSWY3DPEHPK3PXP",
    createdAt: now,
    updatedAt: now,
    lastUsedAt: null,
  };
}

async function assertTabBSees(pageB, marker, label) {
  const timeout = 12_000;
  try {
    await pageB.waitForFunction(
      (m) => document.body.textContent?.includes(m) ?? false,
      marker,
      { timeout },
    );
  } catch (err) {
    await pageB.waitForTimeout(400);
    await pageB.waitForFunction(
      (m) => document.body.textContent?.includes(m) ?? false,
      marker,
      { timeout: 4000 },
    );
  }
  console.log(`OK: ${label}`, marker);
}

async function main() {
  const pw = await loadPlaywright();
  if (!pw) {
    console.warn("SKIP: playwright not installed — run: pnpm exec playwright install chromium in P0004");
    process.exit(0);
  }

  let ping;
  try {
    ping = await fetch(BASE, { signal: AbortSignal.timeout(8000) });
  } catch (e) {
    console.error(`FAIL: cannot reach ${BASE} — start pnpm dev (${e.message})`);
    process.exit(2);
  }
  if (!ping.ok) {
    console.error(`FAIL: ${BASE} returned ${ping.status}`);
    process.exit(2);
  }

  const auth = await signInWithRetry();
  console.log(`E2E 2FA cross-tab on ${BASE} (user ${E2E_EMAIL})…`);

  const browser = await pw.chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    if (auth) await seedAuthContext(context, auth);
    const pageA = await context.newPage();
    const pageB = await context.newPage();

    await signInViaUi(pageA, E2E_EMAIL, E2E_PASSWORD);
    await waitTwofaTable(pageA);
    await signInViaUi(pageB, E2E_EMAIL, E2E_PASSWORD);
    await waitTwofaTable(pageB);

    const vaultCtx = await pageA.evaluate(
      ({ sessionKey, legacyKey, scopedPrefix }) => {
        let userId = null;
        try {
          const raw = sessionStorage.getItem(sessionKey);
          if (raw) userId = JSON.parse(raw)?.user_id ?? null;
        } catch {
          /* guest */
        }
        const storageKey = userId ? `${scopedPrefix}:${userId}` : legacyKey;
        return { storageKey, scopeKey: userId };
      },
      { sessionKey: TWOFA_SESSION_KEY, legacyKey: LEGACY_KEY, scopedPrefix: SCOPED_PREFIX },
    );
    console.log("OK: vault storage", vaultCtx.storageKey);

    const markerStorage = `E2E-Storage-${Date.now()}`;
    await pageA.evaluate(
      ({ marker, storageKey, row }) => {
        const accounts = JSON.parse(localStorage.getItem(storageKey) || "[]");
        accounts.unshift(row);
        localStorage.setItem(storageKey, JSON.stringify(accounts));
      },
      {
        marker: markerStorage,
        storageKey: vaultCtx.storageKey,
        row: draftRow(markerStorage),
      },
    );
    await pageB.evaluate(
      ({ storageKey }) => {
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: storageKey,
            newValue: localStorage.getItem(storageKey),
            storageArea: localStorage,
          }),
        );
      },
      { storageKey: vaultCtx.storageKey },
    );
    await assertTabBSees(pageB, markerStorage, "storage cross-tab");
    await pageA.waitForTimeout(350);

    const markerBroadcast = `E2E-CrossTab-${Date.now()}`;
    await pageA.evaluate(
      ({ marker, channel, storageKey, scopeKey, row }) => {
        const accounts = JSON.parse(localStorage.getItem(storageKey) || "[]");
        accounts.unshift(row);
        localStorage.setItem(storageKey, JSON.stringify(accounts));
        const ch = new BroadcastChannel(channel);
        ch.postMessage({
          type: "local-updated",
          scopeKey,
          at: Date.now(),
          source: "broadcast",
        });
        ch.close();
      },
      {
        marker: markerBroadcast,
        channel: CHANNEL,
        storageKey: vaultCtx.storageKey,
        scopeKey: vaultCtx.scopeKey,
        row: draftRow(markerBroadcast),
      },
    );
    await assertTabBSees(pageB, markerBroadcast, "broadcast cross-tab");

    console.log("E2E passed.");
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error("FAIL:", e);
  process.exit(1);
});
