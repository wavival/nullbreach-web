import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  // The whole project is served under wavival.dev/nullbreach. The landing owns
  // the base root (/nullbreach/); the React SPA lives under /nullbreach/login etc.
  site: "https://wavival.dev",
  base: "/nullbreach",
  integrations: [
    react(),
    // Emits dist/nullbreach/sitemap-index.xml with fully-qualified
    // https://wavival.dev/nullbreach/ URLs. The apex robots.txt (written by
    // scripts/merge-dist.mjs) points crawlers here. Drop the slashless
    // /nullbreach variant so it doesn't duplicate the canonical /nullbreach/.
    sitemap({ filter: (page) => page !== "https://wavival.dev/nullbreach" }),
    // We ship our own @tailwind directives + base layer in src/styles/global.css
    // so we can reuse the SPA's exact base styles (gradient, grid, scrollbar).
    tailwind({ applyBaseStyles: false }),
  ],
});
