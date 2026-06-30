import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/** Spawn local quota probe + Cockpit sync API during Vite dev. */
export function quotaProbeApiPlugin() {
  let child = null;
  return {
    name: "p0020-quota-probe-api",
    configureServer() {
      if (process.env.P0020_QUOTA_PROBE_DISABLED === "1") return;
      const script = path.join(rootDir, "p0020-quota-probe-api.mjs");
      child = spawn(process.execPath, [script], {
        cwd: rootDir,
        stdio: "inherit",
        env: process.env,
      });
      child.on("exit", (code) => {
        if (code && code !== 0) {
          console.warn(`[p0020-quota-probe-api] exited ${code}`);
        }
      });
    },
    closeBundle() {
      child?.kill();
      child = null;
    },
  };
}
