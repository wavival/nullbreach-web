import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  site: "https://nullbreach.netlify.app",
  integrations: [
    react(),
    // We ship our own @tailwind directives + base layer in src/styles/global.css
    // so we can reuse the SPA's exact base styles (gradient, grid, scrollbar).
    tailwind({ applyBaseStyles: false }),
  ],
});
