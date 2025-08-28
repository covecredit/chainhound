import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ["lucide-react"],
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        "service-worker": resolve(__dirname, "src/service-worker.ts"),
      },
      output: {
        entryFileNames: (assetInfo) => {
          return assetInfo.name === "service-worker"
            ? "service-worker.js"
            : "assets/[name]-[hash].js";
        },
      },
    },
  },
  server: {
    host: "localhost",
    port: 4000,
    open: false,
    hmr: {
      host: "localhost",
      port: 4000,
      protocol: "ws",
    },
  },
});
