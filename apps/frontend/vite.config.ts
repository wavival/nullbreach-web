import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

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
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          forms: ["react-hook-form", "@hookform/resolvers", "zod"],
          markdown: ["react-markdown", "remark-gfm"],
          http: ["axios"],
          icons: ["lucide-react"],
        },
      },
    },
  },
});
