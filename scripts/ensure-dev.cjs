/**
 * Start P0020 Vite (5177). Ensures Hub P0004 via dependsOn when invoked from ensure-dev-product.
 * Usage: node scripts/ensure-dev.cjs [--open] [--force] [--recover]
 */
const { execSync } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const toolScripts = path.resolve(root, "..", "scripts");

function main() {
  const flags = [
    process.argv.includes("--open") && "--open",
    process.argv.includes("--force") && "--force",
    process.argv.includes("--recover") && "--recover",
  ]
    .filter(Boolean)
    .join(" ");

  if (process.env.ENSURE_DEV_INNER !== "1") {
    execSync(`node "${path.join(toolScripts, "ensure-dev-product.cjs")}" P0004 ${flags}`.trim(), {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, ENSURE_DEV_INNER: "1" },
    });
  }

  execSync(`node "${path.join(__dirname, "ensure-dev-vite.cjs")}" ${flags}`.trim(), {
    cwd: root,
    stdio: "inherit",
  });
}

main();
