#!/usr/bin/env node
/**
 * P0020 tab loading smoke — lazy mount + HubLoadingView enabled guard.
 *
 * Usage:
 *   node scripts/smoke-tab-loading.mjs
 *   node scripts/smoke-tab-loading.mjs --base http://127.0.0.1:5177 --json
 *   node scripts/smoke-tab-loading.mjs --browser-contract
 *   node scripts/smoke-tab-loading.mjs --geometry
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const toolScripts = path.resolve(root, "..", "scripts");
const sharedAudit = path.join(toolScripts, "audit-public-shadow.cjs");
const hubUiRoot = path.resolve(root, "vendor", "hub-ui");

const args = process.argv.slice(2);
const jsonOut = args.includes("--json");
const browserContractOnly = args.includes("--browser-contract");
const geometryStrict = args.includes("--geometry-strict");
const geometryRequested = args.includes("--geometry") || args.includes("--geometry-strict");
const base = (
  args.find((a) => a.startsWith("--base="))?.slice(7) ??
  process.env.SMOKE_DATABOX_BASE ??
  "http://127.0.0.1:5177"
).replace(/\/$/, "");

const SHELL_MAX_MS = 3000;

export const TAB_LOADING_BROWSER_CONTRACT = {
  browser: "cursor-ide-browser-mcp-only",
  product: "P0020",
  url: base,
  steps: [
    {
      id: "notes-boot-no-todo-overlay",
      label: "Notes loads without Todo loader overlay",
      actions: [
        { tool: "navigate", url: `${base}/notes?_smoke=notes` },
        { tool: "wait_for", time: 2 },
        {
          tool: "assert_dom",
          mustNotInclude: ['[aria-label="Loading todo"]', '[aria-label="Loading cookie auto"]'],
          note: "Hidden lazy tabs must not portal overlay onto Notes",
        },
        { tool: "assert_snapshot", contains: ["Notes"] },
      ],
    },
    {
      id: "cookie-single-loader",
      label: "Cookie tab shows only Cookie loader while chunk loads",
      actions: [
        { tool: "click", find: { role: "button", name: "Cookie Auto" } },
        {
          tool: "assert_dom",
          mustNotInclude: ['[aria-label="Loading todo"]', '[aria-label="Loading 2FA"]'],
          note: "Only active tab may portal loader",
        },
        {
          tool: "assert_dom",
          mayInclude: ['[aria-label="Loading cookie auto"]'],
          note: "Cookie orb while Suspense resolves",
        },
        { tool: "wait_for", time: 2 },
        { tool: "assert_snapshot", contains: ["Cookie Auto"] },
      ],
    },
    {
      id: "fast-switch-no-stacked-icons",
      label: "Fast Notes → Cookie → Todo — no stacked loaders",
      actions: [
        { tool: "click", find: { role: "button", name: "Notes" } },
        { tool: "wait_for", time: 0.3 },
        { tool: "click", find: { role: "button", name: "Cookie Auto" } },
        { tool: "wait_for", time: 0.3 },
        { tool: "click", find: { role: "button", name: "Todo" } },
        { tool: "wait_for", time: 1 },
        {
          tool: "assert_dom",
          loaderRootMaxChildren: 1,
          note: "#hub-tab-loader-root must have at most one visible loader fill",
        },
        { tool: "take_screenshot", note: "Todo active — no cookie/todo icon stack" },
      ],
    },
    {
      id: "cookie-cold-skeleton-inline",
      label: "Cookie cold notes load uses inline skeleton (no full-pane dim)",
      actions: [
        { tool: "navigate", url: `${base}/cookie?_smoke=cookie-skeleton` },
        { tool: "wait_for", time: 1 },
        {
          tool: "assert_dom",
          mayInclude: ['[aria-label="Loading cookie routes"]'],
          note: "Inline CookieDirectorySkeleton during notes cold fetch",
        },
        {
          tool: "assert_dom",
          mustNotInclude: ['[aria-label="Loading todo"]'],
        },
      ],
    },
    {
      id: "loader-orb-centered-in-pane",
      label: "Portaled loader orb centered in main pane",
      actions: [
        { tool: "navigate", url: `${base}/notes?_smoke=loader-geometry` },
        { tool: "wait_for", time: 2 },
        {
          tool: "assert_loader_geometry",
          paneSelector: ".hub-main",
          loaderRoot: "#hub-tab-loader-root",
          toleranceXPct: 0.06,
          toleranceYPct: 0.1,
        },
      ],
    },
  ],
};

const STATIC_CHECKS = [
  {
    id: "public-shadow-audit",
    file: sharedAudit,
    runScript: true,
    runArgs: ["P0020"],
  },
  {
    id: "lazy-visited-init",
    file: path.join(root, "src", "features", "workspace", "WorkspaceApp.tsx"),
    pattern: /new Set\(\[activeNav\]\)/,
    invert: false,
  },
  {
    id: "eager-all-nav-screens-after-session",
    file: path.join(root, "src", "features", "workspace", "WorkspaceApp.tsx"),
    pattern: /for \(const tab of NAV_SCREENS\)/,
    invert: false,
  },
  {
    id: "hub-loading-enabled-prop",
    file: path.join(hubUiRoot, "src", "shell", "HubLoadingView.tsx"),
    pattern: /enabled\?: boolean/,
    invert: false,
  },
  {
    id: "workspace-loading-enabled-guard",
    file: path.join(root, "src", "features", "workspace", "WorkspaceApp.tsx"),
    pattern: /enabled=\{screen === "cookie"\}/,
    invert: false,
  },
  {
    id: "workspace-loading-view-enabled-api",
    file: path.join(root, "src", "components", "sales-shell", "HubLoadingView.tsx"),
    pattern: /enabled = true/,
    invert: false,
  },
  {
    id: "eager-prefetch-only",
    file: path.join(root, "src", "lib", "workspace-eager-tabs.ts"),
    pattern: /prefetchTab\(screen\)/,
    invert: false,
  },
  {
    id: "cookie-directory-skeleton",
    file: path.join(root, "src", "features", "cookie", "CookieDirectorySkeleton.tsx"),
    pattern: /Loading cookie routes/,
    invert: false,
  },
  {
    id: "cookie-instant-directory",
    file: path.join(root, "src", "features", "cookie", "CookieAutoSyncTable.tsx"),
    pattern: /prefetchNoteCookieMembersBatch/,
    invert: false,
  },
  {
    id: "hub-tab-loading-contract",
    file: path.join(hubUiRoot, "HubTabLoadingContract.md"),
    pattern: /enabled=\{active\}/,
    invert: false,
  },
  {
    id: "hub-loader-root",
    file: path.join(root, "src", "features", "workspace", "WorkspaceApp.tsx"),
    pattern: /HubLoaderRoot/,
    invert: false,
  },
];

function runStaticChecks() {
  const results = [];
  for (const check of STATIC_CHECKS) {
    if (check.runScript) {
      const run = spawnSync(process.execPath, [check.file, ...(check.runArgs ?? [])], {
        cwd: root,
        encoding: "utf8",
      });
      const pass = run.status === 0;
      results.push({
        id: check.id,
        pass,
        file: path.relative(root, check.file),
        note: pass ? "public/ shadow audit" : (run.stderr || run.stdout || "").trim().slice(0, 200),
      });
      continue;
    }
    const text = fs.readFileSync(check.file, "utf8");
    const matched = check.pattern.test(text);
    const pass = check.invert ? !matched : matched;
    results.push({ id: check.id, pass, file: path.relative(root, check.file) });
  }
  return results;
}

async function timedFetch(url) {
  const started = performance.now();
  const res = await fetch(url, { headers: { Accept: "text/html,application/json" } });
  const ms = Math.round(performance.now() - started);
  return { res, ms };
}

export async function runLoaderGeometryCheck(baseUrl) {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    return {
      id: "loader-geometry",
      pass: !geometryStrict,
      skipped: true,
      note: "playwright not installed",
    };
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(`${baseUrl}/notes?_smoke=loader-geometry`, {
      waitUntil: "load",
      timeout: 25000,
    });

    const ready = await page
      .waitForSelector(".hub-main", { timeout: 18000, state: "attached" })
      .then(() => true)
      .catch(() => false);

    if (!ready) {
      return { id: "loader-geometry", pass: false, error: "timeout waiting for .hub-main" };
    }

    await page.waitForTimeout(1500);

    const result = await page.evaluate(() => {
      const main = document.querySelector(".hub-main");
      let root = document.getElementById("hub-tab-loader-root");
      if (!root) {
        root = document.createElement("div");
        root.id = "hub-tab-loader-root";
        root.className = "pointer-events-none";
        document.body.appendChild(root);
      }
      if (!main) return { ok: false, reason: "missing .hub-main" };

      const probe = document.createElement("div");
      probe.className = "hub-tab-loader-fill hub-tab-loader-fill--dim";
      probe.setAttribute("role", "status");
      probe.setAttribute("aria-label", "smoke-loader-probe");
      const orb = document.createElement("div");
      orb.className = "hub-loader-orb";
      orb.style.width = "6rem";
      orb.style.height = "6rem";
      probe.appendChild(orb);
      root.appendChild(probe);

      const m = main.getBoundingClientRect();
      const chrome = main.querySelector("[data-hub-main-chrome]");
      const chromeBottom =
        chrome && chrome.offsetHeight > 0 ? chrome.getBoundingClientRect().bottom : m.top;
      const contentTop = chromeBottom;
      const contentHeight = Math.max(0, m.bottom - contentTop);
      const paneCx = m.left + m.width / 2;
      const paneCy = contentTop + contentHeight / 2;

      const o = orb.getBoundingClientRect();
      const orbCx = o.left + o.width / 2;
      const orbCy = o.top + o.height / 2;
      const dx = Math.abs(paneCx - orbCx);
      const dy = Math.abs(paneCy - orbCy);
      const toleranceX = Math.max(24, m.width * 0.06);
      const toleranceY = Math.max(24, contentHeight * 0.1);

      probe.remove();
      return {
        ok: dx <= toleranceX && dy <= toleranceY,
        dx: Math.round(dx),
        dy: Math.round(dy),
        toleranceX: Math.round(toleranceX),
        toleranceY: Math.round(toleranceY),
      };
    });

    return {
      id: "loader-geometry",
      pass: Boolean(result.ok),
      ...result,
      note: result.ok
        ? `centered in .hub-main (dx=${result.dx} dy=${result.dy})`
        : result.reason ?? `off-center dx=${result.dx} dy=${result.dy}`,
    };
  } catch (e) {
    return { id: "loader-geometry", pass: false, error: e.message };
  } finally {
    await browser.close();
  }
}

async function runRuntimeChecks() {
  const results = [];

  try {
    const { res, ms } = await timedFetch(`${base}/`);
    results.push({
      id: "databox-html",
      pass: res.ok && ms < SHELL_MAX_MS,
      ms,
      status: res.status,
      note: `Shell < ${SHELL_MAX_MS}ms`,
    });
  } catch (e) {
    results.push({ id: "databox-html", pass: false, error: e.message });
  }

  for (const route of ["/notes", "/cookie", "/todo"]) {
    try {
      const { res, ms } = await timedFetch(`${base}${route}`);
      const html = await res.text();
      results.push({
        id: `route-${route.slice(1)}`,
        pass: res.ok && (html.includes("/src/main.tsx") || html.includes("hub-boot-fallback.js")),
        ms,
        status: res.status,
      });
    } catch (e) {
      results.push({ id: `route-${route.slice(1)}`, pass: false, error: e.message });
    }
  }

  const shellOk = results.find((r) => r.id === "databox-html")?.pass;
  if (geometryRequested && shellOk) {
    results.push(await runLoaderGeometryCheck(base));
  } else if (geometryRequested) {
    results.push({
      id: "loader-geometry",
      pass: !geometryStrict,
      skipped: true,
      note: "skipped — dev server not reachable (pnpm open)",
    });
  }

  return results;
}

function printHuman(staticResults, runtimeResults) {
  console.log("P0020 tab loading smoke\n");

  console.log("Static:");
  for (const r of staticResults) {
    console.log(`${r.pass ? "OK " : "FAIL"} ${r.id} (${r.file})`);
  }

  console.log("\nRuntime:");
  for (const r of runtimeResults) {
    if (r.pass) {
      const timing = r.ms != null ? ` ${r.ms}ms` : "";
      const extra = r.note ? ` — ${r.note}` : "";
      console.log(`OK  ${r.id}${timing}${extra}`);
    } else {
      console.log(`FAIL ${r.id}${r.error ? `: ${r.error}` : ""}${r.ms != null ? ` (${r.ms}ms)` : ""}`);
    }
  }

  const failed =
    staticResults.filter((r) => !r.pass).length + runtimeResults.filter((r) => !r.pass).length;
  if (failed) {
    console.error(`\n${failed} check(s) failed`);
    console.log("\nBrowser MCP contract: node scripts/smoke-tab-loading.mjs --browser-contract");
    process.exit(1);
  }

  console.log("\nAll checks passed. Browser MCP: node scripts/smoke-tab-loading.mjs --browser-contract");
}

async function main() {
  if (browserContractOnly) {
    console.log(JSON.stringify(TAB_LOADING_BROWSER_CONTRACT, null, 2));
    return;
  }

  const staticResults = runStaticChecks();
  const runtimeResults = await runRuntimeChecks();
  const payload = {
    product: "P0020",
    base,
    static: staticResults,
    runtime: runtimeResults,
    browserContract: TAB_LOADING_BROWSER_CONTRACT,
  };

  if (jsonOut) {
    console.log(JSON.stringify(payload, null, 2));
    const failed =
      staticResults.some((r) => !r.pass) || runtimeResults.some((r) => !r.pass);
    process.exit(failed ? 1 : 0);
    return;
  }

  printHuman(staticResults, runtimeResults);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
