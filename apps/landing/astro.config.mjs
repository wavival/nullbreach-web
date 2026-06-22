import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  // The whole project is served under wavival.dev/nullbreach. The landing owns
  // the base root (/nullbreach/); the React SPA lives under /nullbreach/login etc.
  site: "https://wavival.dev",
  base: "/nullbreach",
  // Prefetch in-viewport links on hover/tap so landing→SPA nav feels instant.
  prefetch: { prefetchAll: true, defaultStrategy: "hover" },
  integrations: [
    // Emits dist/nullbreach/sitemap-index.xml with fully-qualified
    // https://wavival.dev/nullbreach/ URLs. The apex robots.txt (written by
    // scripts/merge-dist.mjs) points crawlers here. Drop the slashless
    // /nullbreach variant so it doesn't duplicate the canonical /nullbreach/.
    sitemap({
      // Emit <xhtml:link rel="alternate" hreflang> per entry so crawlers link
      // the es ↔ en URLs from the sitemap, not just the in-page <head> hreflang.
      // hreflang values match the in-page <head> alternates (es / en).
      i18n: { defaultLocale: "es", locales: { es: "es", en: "en" } },
      filter: (page) => page !== "https://wavival.dev/nullbreach",
    }),
    // We ship our own @tailwind directives + base layer in src/styles/global.css
    // so we can reuse the SPA's exact base styles (gradient, grid, scrollbar).
    tailwind({ applyBaseStyles: false }),
  ],
});
