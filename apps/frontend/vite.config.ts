import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vendor chunking. Vite 8 only accepts `manualChunks` as a function, so we map
// each package to a chunk by matching its node_modules path. The trailing
// slash keeps boundaries exact (e.g. `react/` ≠ `react-dom/`).
const vendorChunks: Record<string, string[]> = {
  "react-vendor": ["react", "react-dom", "react-router-dom"],
  forms: ["react-hook-form", "@hookform/resolvers", "zod"],
  markdown: ["react-markdown", "remark-gfm"],
  icons: ["lucide-react"],
};

export default defineConfig({
  base: "/nullbreach/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          for (const [chunk, pkgs] of Object.entries(vendorChunks)) {
            if (pkgs.some((p) => id.includes(`node_modules/${p}/`))) {
              return chunk;
            }
          }
        },
      },
    },
  },
});
