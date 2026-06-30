#!/usr/bin/env node
/** Cross-shell build chain (no &&) for Windows PowerShell + pnpm. */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(label, cmd, args) {
  const result = spawnSync(cmd, args, { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  if ((result.status ?? 1) !== 0) {
    console.error(`run-build: ${label} failed (exit ${result.status ?? 1})`);
    process.exit(result.status ?? 1);
  }
}

run("tsc", "pnpm", ["exec", "tsc", "--noEmit"]);
run("vitest", "pnpm", ["exec", "vitest", "run", "--passWithNoTests"]);
run("vite", "pnpm", ["exec", "vite", "build"]);
