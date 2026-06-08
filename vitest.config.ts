import viteConfig from "./vite.config";

export default {
  ...viteConfig,
  test: {
    exclude: ["vendor/**", "node_modules/**", "dist/**"],
  },
};
