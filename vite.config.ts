import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 3000
  },
  build: { outDir: "dist/public" },
  plugins: [svelte()],
  logLevel: "info",
});
