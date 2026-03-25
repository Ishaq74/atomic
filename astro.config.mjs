import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import Icon from "astro-icon";
import sitemap from '@astrojs/sitemap';

import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      holdUntilCrawlEnd: false,
    },
  },

  site: (() => {
    const url = process.env.SITE_URL;
    if (!url) {
      // Warn but don't crash — hard-fail only when building for deployment (CI sets SITE_URL).
      // Vite statically replaces process.env.NODE_ENV, so we can't gate on it here.
      console.warn('[ASTRO] SITE_URL is not set — using http://localhost:4321 fallback. Set SITE_URL for production builds.');
      return 'http://localhost:4321';
    }
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
      return parsed.origin;
    } catch {
      throw new Error(`[ASTRO] SITE_URL is invalid: "${url}". Must be a valid http(s) URL.`);
    }
  })(),

  i18n: {
    locales: ['fr', 'en', 'es', 'ar'],
    defaultLocale: 'fr',
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: true,
    },
  },

  integrations: [Icon(), sitemap()],

  adapter: node({
    mode: 'standalone'
  }),

  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "connect-src 'self'",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
        "frame-ancestors 'none'",
      ],
    },
  },
});