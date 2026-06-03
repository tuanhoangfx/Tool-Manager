/**
 * Start P0020 Vite (port 5177). Ensures Hub :5176 via dependsOn in ensure-dev-product.
 * Usage: node scripts/ensure-dev.cjs [--open] [--force]
 *
 * Do NOT call ensure-dev-product with P0004+P0020 here — that caused infinite recursion
 * when ensure-dev-product delegates to this script (each --open opened new browser tabs).
 */
const { execSync } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const toolScripts = path.resolve(root, "..", "scripts");

function main() {
  const flags = [
    process.argv.includes("--open") && "--open",
    process.argv.includes("--force") && "--force",
  ]
    .filter(Boolean)
    .join(" ");

  execSync(`node "${path.join(toolScripts, "ensure-dev-product.cjs")}" P0020 ${flags}`.trim(), {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ENSURE_DEV_INNER: "1" },
  });
}

main();
