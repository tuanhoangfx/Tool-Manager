import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// @ts-expect-error shared chunk helper (JS module)
import { createHubManualChunks } from "./scripts/vite-hub-chunks.mjs";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const hubUiSrc = path.resolve(rootDir, "vendor/hub-ui/src");
const hubIdentitySrc = path.resolve(rootDir, "vendor/hub-identity/src");
const devRoot = path.resolve(rootDir, "../..");

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: createHubManualChunks({
          features: {
            inbox: "feature-notes",
            "features/twofa": "feature-twofa",
            "features/cookie": "feature-cookie",
            "features/todo/components/CalendarView": "feature-todo-calendar",
            "features/todo/components/UserGuide": "feature-todo-userguide",
            "features/todo": "feature-todo",
            "features/system": "feature-system",
          },
        }),
      },
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "lucide-react"],
    exclude: ["@tool-workspace/hub-ui", "@tool-workspace/hub-identity"],
    holdUntilCrawlEnd: false,
  },
  esbuild: {
    target: "es2022",
  },
  server: {
    host: "127.0.0.1",
    port: 5177,
    strictPort: true,
    open: false,
    fs: {
      allow: [rootDir, hubUiSrc, hubIdentitySrc, devRoot],
    },
  },
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: [
      { find: "@tool-workspace/hub-ui", replacement: path.join(hubUiSrc, "index.ts") },
      { find: /^@tool-workspace\/hub-ui\/(.+)$/, replacement: `${hubUiSrc}/$1` },
      { find: "@tool-workspace/hub-identity", replacement: path.join(hubIdentitySrc, "index.ts") },
      { find: /^@tool-workspace\/hub-identity\/(.+)$/, replacement: `${hubIdentitySrc}/$1` },
      { find: "@dev/hub-identity", replacement: path.join(hubIdentitySrc, "index.ts") },
      { find: /^@dev\/hub-identity\/(.+)$/, replacement: `${hubIdentitySrc}/$1` },
      { find: "@p0020/bridge", replacement: path.resolve(rootDir, "packages/p0020-bridge/src") },
      { find: "@dev/hub-load", replacement: path.resolve(rootDir, "vendor/hub-load/src") },
    ],
  },
});
