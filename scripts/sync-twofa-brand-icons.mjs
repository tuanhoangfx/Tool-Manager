#!/usr/bin/env node
/**
 * Sync local brand icons for Account Vault (twofa-platform-icons.registry.json).
 * Sources (in order): Google Drive shared folder, existing node_modules copy, Google favicon.
 */
import { access, copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(projectRoot, "..", "..");
const outDir = path.join(projectRoot, "public", "assets", "brand-icons");
const nodeBrandDir = path.join(workspaceRoot, "node_modules", "p0020-data-box", "public", "assets", "brand-icons");

/** Shared Drive folder: https://drive.google.com/drive/folders/1PMzS8CZrzneTvnMmbv3KHnmSVH5mszMS */
const DRIVE_DOWNLOADS = [
  { file: "artlist.png", driveId: "1xh5IMxJV3KSyGOqa4w3SpCLhpS9d2BAu" },
  { file: "augment.png", driveId: "11GfnIwLRQzNOIL6lD44BUw5KwEo-AVfu" },
  { file: "blackbox.png", driveId: "156mFcRm74T78rlF_d_PLdooSgmdv0qrJ" },
  { file: "bigspy.png", driveId: "17ArL0K99xbjjfswQtLiS6-rpXURqgsNl" },
  { file: "beautyplus.png", driveId: "1IprWEXGDeiyp6MBAn5jOrBNSlgtRrCq2" },
  { file: "camtasia.png", driveId: "1S6m3z1W_hSXnkiDxfAqJC2pkIlHIemdd" },
  { file: "capcut.png", driveId: "1C7Htp4GVnZGyWuOQkLOHneL2cYXiFrx7" },
  { file: "claude.png", driveId: "18uTW0QCgswp9BgWZfZt4IFb0Dei4b0Ve" },
];

const COPY_FROM_NODE = ["kalodata.png", "cursor.png", "bigspy.png", "chatgpt.svg"];

/** Favicon fallback when icon is not on thesvg CDN or Drive. */
const FAVICON_DOWNLOADS = [
  { file: "heygen.png", domain: "heygen.com" },
  { file: "kling.png", domain: "klingai.com" },
  { file: "higgsfield.png", domain: "higgsfield.ai" },
  { file: "topview.png", domain: "topview.ai" },
  { file: "exness.png", domain: "exness.com" },
  { file: "deevid.png", domain: "deevid.ai" },
  { file: "litefinance.png", domain: "litefinance.org" },
  { file: "vtmarkets.png", domain: "vtmarkets.com" },
  { file: "leonardo.png", domain: "leonardo.ai" },
  { file: "meitu.png", domain: "meitu.com" },
  { file: "minea.png", domain: "minea.com" },
  { file: "garena.png", domain: "garena.vn" },
  { file: "fshare.png", domain: "fshare.vn" },
  { file: "coingecko.png", domain: "coingecko.com" },
  { file: "fliki.png", domain: "fliki.ai" },
  { file: "filmora.png", domain: "filmora.wondershare.com" },
  { file: "genspark.png", domain: "genspark.ai" },
  { file: "openart.png", domain: "openart.ai" },
  { file: "quillbot.png", domain: "quillbot.com" },
  { file: "glm.png", domain: "z.ai" },
  { file: "piclumen.png", domain: "www.piclumen.com" },
  { file: "turboscribe.png", domain: "turboscribe.ai" },
  { file: "skool.png", domain: "skool.com" },
  { file: "riot.png", domain: "riotgames.com" },
  { file: "weibo.png", domain: "weibo.com" },
  { file: "douyin.png", domain: "douyin.com" },
  { file: "cursor.png", domain: "cursor.com" },
  { file: "chatgpt.png", domain: "chatgpt.com" },
  { file: "github-copilot.png", domain: "github.com" },
];

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function downloadDrive(fileName, driveId) {
  const dest = path.join(outDir, fileName);
  const url = `https://drive.google.com/uc?export=download&id=${driveId}`;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Drive ${fileName}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 200) throw new Error(`Drive ${fileName}: payload too small (${buf.length} B)`);
  await writeFile(dest, buf);
  return dest;
}

async function downloadFavicon(fileName, domain) {
  const dest = path.join(outDir, fileName);
  const url = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Favicon ${fileName}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 100) throw new Error(`Favicon ${fileName}: payload too small`);
  await writeFile(dest, buf);
  return dest;
}

async function main() {
  await mkdir(outDir, { recursive: true });
  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (const row of DRIVE_DOWNLOADS) {
    const dest = path.join(outDir, row.file);
    try {
      await downloadDrive(row.file, row.driveId);
      console.log(`OK  drive  ${row.file}`);
      ok += 1;
    } catch (error) {
      if (await exists(dest)) {
        console.log(`SKIP drive ${row.file} (keep existing): ${error.message}`);
        skip += 1;
      } else {
        console.warn(`FAIL drive ${row.file}: ${error.message}`);
        fail += 1;
      }
    }
  }

  for (const file of COPY_FROM_NODE) {
    const dest = path.join(outDir, file);
    if (await exists(dest)) {
      skip += 1;
      continue;
    }
    const src = path.join(nodeBrandDir, file);
    if (!(await exists(src))) {
      console.warn(`FAIL copy ${file}: missing ${src}`);
      fail += 1;
      continue;
    }
    await copyFile(src, dest);
    console.log(`OK  copy  ${file}`);
    ok += 1;
  }

  for (const row of FAVICON_DOWNLOADS) {
    const dest = path.join(outDir, row.file);
    if (await exists(dest)) {
      skip += 1;
      continue;
    }
    try {
      await downloadFavicon(row.file, row.domain);
      console.log(`OK  favicon ${row.file}`);
      ok += 1;
    } catch (error) {
      console.warn(`FAIL favicon ${row.file}: ${error.message}`);
      fail += 1;
    }
  }

  console.log(`\nTwofa brand icons: ${ok} synced, ${skip} skipped, ${fail} failed → ${path.relative(workspaceRoot, outDir)}`);
  if (fail > 0) process.exit(1);
}

main();
