import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const STEALTH_BASE = (process.env.STEALTH_BROWSER_API_URL || "http://127.0.0.1:6003").replace(/\/$/, "");
const __dirname = dirname(fileURLToPath(import.meta.url));
const devRoot = resolve(__dirname, "../../../..");

async function stealthHealthOk() {
  try {
    const res = await fetch(`${STEALTH_BASE}/api/health`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return false;
    const data = await res.json();
    return data.ok === true;
  } catch {
    return false;
  }
}

function spawnEnsureP0003() {
  return new Promise((resolve, reject) => {
    const child = spawn("node", ["Tool/scripts/ensure-dev-product.cjs", "P0003"], {
      cwd: devRoot,
      stdio: "ignore",
      shell: true,
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ensure-dev P0003 exited ${code ?? "?"}`));
    });
  });
}

/** Ensure P0003 Stealth Browser API (:6003) is up — start stack if needed. */
export async function ensureStealthBrowserReady(timeoutMs = 90_000) {
  if (await stealthHealthOk()) return { ok: true, started: false };

  try {
    await spawnEnsureP0003();
  } catch {
    /* ensure may no-op if already starting */
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await stealthHealthOk()) return { ok: true, started: true };
    await new Promise((r) => setTimeout(r, 2000));
  }

  throw new Error("P0003 Stealth Browser not reachable on :6003 — start P0003 Stealth Browser Console");
}

export { STEALTH_BASE };
