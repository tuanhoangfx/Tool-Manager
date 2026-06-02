/**
 * Start P0020 Vite dev server (port 5177). Optional: --open
 */
const { spawn } = require("node:child_process");
const path = require("node:path");
const http = require("node:http");

const root = path.resolve(__dirname, "..");
const hubRoot = path.resolve(root, "..", "P0004-Tool-Hub");
const HUB_URL = "http://127.0.0.1:5176/";
const PORT = 5177;
const URL = `http://127.0.0.1:${PORT}/notes`;

function probe(url, timeoutMs = 800) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode != null && res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function ensureHub() {
  if (await probe(HUB_URL)) return;
  console.log("Tool Hub (5176) not running — starting in background…");
  spawn("corepack", ["pnpm", "run", "dev:vite"], {
    cwd: hubRoot,
    shell: true,
    detached: true,
    stdio: "ignore",
  }).unref();
  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
    if (await probe(HUB_URL)) {
      console.log(`Tool Hub ready → ${HUB_URL}`);
      return;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  console.warn("Tool Hub did not respond on 5176 — P0020 will still start; open Hub manually if needed.");
}

async function main() {
  const open = process.argv.includes("--open");
  await ensureHub();
  if (await probe(URL)) {
    console.log(`P0020 already running → ${URL}`);
    if (open) spawn("cmd", ["/c", "start", "", URL], { detached: true, stdio: "ignore" });
    return;
  }

  const child = spawn("pnpm", ["run", "dev:vite"], {
    cwd: root,
    shell: true,
    stdio: "inherit",
  });

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (await probe(URL)) {
      console.log(`\nP0020 ready → ${URL}\n`);
      if (open) spawn("cmd", ["/c", "start", "", URL], { detached: true, stdio: "ignore" });
      return;
    }
    await new Promise((r) => setTimeout(r, 400));
  }

  console.error("Timed out waiting for Vite on port", PORT);
  child.kill();
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
