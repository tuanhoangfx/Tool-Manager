#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const token = process.argv[2];
if (!token?.startsWith("vcp_")) {
  console.error("usage: node scripts/_update-vercel-token.mjs <vcp_...>");
  process.exit(1);
}
const file = path.resolve("E:/Dev/.env.shared");
let text = fs.readFileSync(file, "utf8");
if (/^VERCEL_TOKEN=/m.test(text)) {
  text = text.replace(/^VERCEL_TOKEN=.*$/m, `VERCEL_TOKEN=${token}`);
} else {
  text = `${text.trimEnd()}\nVERCEL_TOKEN=${token}\n`;
}
fs.writeFileSync(file, text, "utf8");
console.log("VERCEL_TOKEN updated in .env.shared (len=" + token.length + ")");
