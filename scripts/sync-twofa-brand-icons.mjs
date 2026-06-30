#!/usr/bin/env node
/** @deprecated Use `sync-hub-brand-icons.mjs` — kept for P0020 predev alias. */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "scripts", "sync-hub-brand-icons.mjs");
const res = spawnSync(process.execPath, [script, "--code", "P0020"], { stdio: "inherit" });
process.exit(res.status ?? 1);
