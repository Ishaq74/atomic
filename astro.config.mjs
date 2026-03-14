import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import Icon from "astro-icon";
import sitemap from '@astrojs/sitemap';

import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  vite: {
  plugins: [tailwindcss()]
},

  site: process.env.SITE_URL ?? 'http://localhost:4321',

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
  })
});