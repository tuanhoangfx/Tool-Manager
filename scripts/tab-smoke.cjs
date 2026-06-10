#!/usr/bin/env node
/**
 * P0020 tab smoke — HTTP + import guard + tsc (no browser).
 *
 * Usage: node Tool/P0020-Data-Box/scripts/tab-smoke.cjs
 */
const { execSync } = require("node:child_process");
const http = require("node:http");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const toolScripts = path.resolve(root, "..", "scripts");
const base = "http://127.0.0.1:5177";
const routes = ["/notes", "/todo", "/twofa", "/cookie", "/system"];

function get(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ status: res.statusCode, data }));
    });
    req.on("error", reject);
    req.setTimeout(8000, () => {
      req.destroy();
      reject(new Error(`timeout ${url}`));
    });
  });
}

async function httpSmoke() {
  console.log("\n[P0020 smoke] HTTP routes");
  let failed = 0;
  for (const route of routes) {
    try {
      const r = await get(`${base}${route}`);
      const ok =
        r.status === 200 &&
        (r.data.includes("/src/main.tsx") || r.data.includes("hub-boot-fallback.js"));
      console.log(`  ${ok ? "OK" : "FAIL"}  ${route} (${r.status})`);
      if (!ok) failed++;
    } catch (e) {
      console.log(`  FAIL  ${route} — ${e.message}`);
      failed++;
    }
  }
  try {
    const main = await get(`${base}/src/main.tsx`);
    const ok = main.status === 200 && main.data.includes("mountHubApp");
    console.log(`  ${ok ? "OK" : "FAIL"}  /src/main.tsx (${main.status})`);
    if (!ok) failed++;
  } catch (e) {
    console.log(`  FAIL  /src/main.tsx — ${e.message}`);
    failed++;
  }
  return failed;
}

function runStep(label, cmd, cwd) {
  console.log(`\n[P0020 smoke] ${label}`);
  console.log(`  $ ${cmd}`);
  try {
    execSync(cmd, { cwd, stdio: "inherit" });
    console.log(`  OK    ${label}`);
    return 0;
  } catch {
    console.log(`  FAIL  ${label}`);
    return 1;
  }
}

(async () => {
  console.log("[P0020 smoke] Tab smoke — Notes · Todo · 2FA · Cookie · System");
  let failed = 0;
  failed += await httpSmoke();
  failed += runStep(
    "hub-ui import guard",
    `node "${path.join(toolScripts, "hub-ui-import-check.mjs")}" --code P0020`,
    root,
  );
  failed += runStep("TypeScript", "pnpm exec tsc --noEmit", root);
  if (failed) {
    console.log(`\n[P0020 smoke] ${failed} step(s) failed — run: pnpm dev:recover`);
    process.exit(1);
  }
  console.log("\n[P0020 smoke] All checks passed");
})();
