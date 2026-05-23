import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            if (id.includes("features/todo/p0019")) return "app-todo";
            if (id.includes("features/notes")) return "app-notes";
            if (id.includes("features/twofa")) return "app-twofa";
            if (id.includes("features/hub/") || id.includes("features/store")) return "hub-p0004";
            return;
          }
          if (id.includes("@supabase")) return "vendor-supabase";
          if (id.includes("lucide-react")) return "vendor-icons";
          if (id.includes("react-dom") || id.includes("react/")) return "vendor-react";
        },
      },
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5177,
    strictPort: true,
    open: false,
  },
  resolve: {
    alias: {
      /** P0019 @/ imports — only used under src/features/todo/p0019 */
      "@": path.resolve(rootDir, "src/features/todo/p0019"),
    },
  },
});
