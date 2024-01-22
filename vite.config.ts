import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      "/arena-api": "https://api.are.na",
      "/arena-dev": {
        target: "https://dev.are.na",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/arena-dev/, ""),
      },
    },
  },
  build: { outDir: "dist/public" },
  plugins: [svelte()],
  logLevel: "info",
});
