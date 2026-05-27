import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(projectRoot, "..", "..");
const extensionRoot = path.join(workspaceRoot, "Extension", "E0001-cookie-bridge");
const registryPath = path.join(projectRoot, "src", "features", "cookie", "cookieBrandIcons.registry.json");
const generatedPath = path.join(extensionRoot, "cookie-brand-icons.generated.js");

const registry = JSON.parse(await readFile(registryPath, "utf8"));

const js = `/** Generated from P0020 cookieBrandIcons.registry.json. Keep in sync via P0020 icon standard. */
export const COOKIE_BRAND_ICON_REGISTRY = Object.freeze(${JSON.stringify(registry, null, 2)});
`;

await writeFile(generatedPath, js, "utf8");

for (const entry of registry) {
  if (entry.source?.type !== "local" || !entry.source.webSrc || !entry.source.extensionSrc) continue;
  const webAsset = path.join(projectRoot, "public", entry.source.webSrc.replace(/^\//, ""));
  const extensionAsset = path.join(extensionRoot, entry.source.extensionSrc);
  await mkdir(path.dirname(extensionAsset), { recursive: true });
  await copyFile(webAsset, extensionAsset);
}

console.log(`Synced ${registry.length} Cookie Auto brand icons to ${path.relative(workspaceRoot, extensionRoot)}`);
