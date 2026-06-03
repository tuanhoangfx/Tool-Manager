/**
 * Start P0020 Vite (port 5177). Ensures Hub :5176 first. Optional: --open
 */
const { spawn, execSync } = require("node:child_process");
const path = require("node:path");
const http = require("node:http");

const root = path.resolve(__dirname, "..");
const toolScripts = path.resolve(root, "..", "scripts");
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

async function main() {
  const open = process.argv.includes("--open");
  const flags = [open && "--open", process.argv.includes("--force") && "--force"].filter(Boolean).join(" ");

  execSync(`node "${path.join(toolScripts, "ensure-dev-product.cjs")}" P0004 P0020 ${flags}`.trim(), {
    cwd: root,
    stdio: "inherit",
  });

  if (await probe(URL)) {
    console.log(`P0020 ready → ${URL}`);
    return;
  }

  console.error("P0020 did not respond on port", PORT);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
