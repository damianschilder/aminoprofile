// https://nuxt.com/docs/api/configuration/nuxt-config
import { SITE_NAME, SITE_URL } from './shared/site';

export default defineNuxtConfig({
  pages: true,

  // Cloudflare Workers (module syntax). The build writes .output/server/wrangler.json, so
  // `npx wrangler deploy` works straight after `npm run build`. NITRO_PRESET=node-server builds a
  // plain Node server instead, for running it locally.
  nitro: {
    preset: process.env.NITRO_PRESET || 'cloudflare-module',
    cloudflare: {
      deployConfig: true,
      nodeCompat: true,
      wrangler: {
        name: 'aminoprofile',
        // Only reachable on aminoprofile.com: no *.workers.dev address and no preview URL per
        // version. www.aminoprofile.com reaches the Worker too and is redirected by
        // server/middleware/canonical-host.ts.
        workers_dev: false,
        preview_urls: false,
        routes: [
          { pattern: 'aminoprofile.com', custom_domain: true },
          { pattern: 'www.aminoprofile.com', custom_domain: true },
        ],
        vars: { NUXT_CANONICAL_HOST: new URL(SITE_URL).host },
        // NUXT_FOODCENTRAL_API_KEY (a secret) and NUXT_PUBLIC_CF_BEACON_TOKEN are set in Cloudflare.
        keep_vars: true,
      },
    },
  },

  features: {
    // Also inline the global stylesheet (assets/style/app.scss, 2.5 kB) in the HTML, as Nuxt
    // already does for the component styles: the first paint then waits for no CSS request.
    inlineStyles: true,
  },

  experimental: {
    // Skip the start-up fetch of /_nuxt/builds/meta/<build>.json: if it fails (a search engine's
    // renderer, a page cached from an older deploy) Nuxt replaces the page with a 500 error.
    appManifest: false,
  },

  runtimeConfig: {
    // NUXT_CANONICAL_HOST: the one host the site answers on; set by the Worker config above.
    canonicalHost: '',
    // NUXT_FOODCENTRAL_API_KEY: the USDA FoodData Central API key. Server-only, never sent to the
    // browser. Empty means USDA's rate-limited DEMO_KEY (see server/api/foods/search.get.ts).
    foodcentralApiKey: '',
    // NUXT_FOODCENTRAL_API_URL: only for tests against a local stand-in of the API. Empty means
    // https://api.nal.usda.gov/fdc/v1.
    foodcentralApiUrl: '',
    public: {
      // NUXT_PUBLIC_CF_BEACON_TOKEN: Cloudflare Web Analytics (cookieless, no personal data).
      // Empty means no analytics script at all.
      cfBeaconToken: '',
    },
  },

  routeRules: {
    '/**': {
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'X-Frame-Options': 'DENY',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        'Strict-Transport-Security': 'max-age=31536000',
        'Content-Security-Policy': "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
      },
    },
    '/api/**': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    // The open dataset in public/data/ (data/README.md): readable from any site, cached for a day.
    // On Cloudflare these reach the static files through the generated .output/public/_headers,
    // like the headers above. One rule per file rather than '/data/**', because that pattern
    // would also match the /data page itself and let browsers keep its HTML for a day.
    '/data/aminoprofile-foods.json': {
      headers: {
        'access-control-allow-origin': '*',
        'cache-control': 'public, max-age=86400',
      },
    },
    '/data/aminoprofile-foods.csv': {
      headers: {
        'access-control-allow-origin': '*',
        'cache-control': 'public, max-age=86400',
        'content-type': 'text/csv; charset=utf-8',
      },
    },
    // The AI Catalog (public/.well-known/ai-catalog.json): where agents find the MCP server card.
    '/.well-known/ai-catalog.json': {
      headers: {
        'access-control-allow-origin': '*',
        'cache-control': 'public, max-age=3600',
        'content-type': 'application/ai-catalog+json',
      },
    },
  },

  app: {
    head: {
      title: SITE_NAME,
      htmlAttrs: { lang: 'en' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        // White like the header, so browsers that colour their toolbar (Safari) keep the look.
        { name: 'theme-color', content: '#ffffff' },
        // How a shared link looks. Each page sets its own title, description, URL and canonical
        // link; the picture (public/og-image.png, made from docs/og-image.html) is the same.
        { property: 'og:site_name', content: SITE_NAME },
        { property: 'og:type', content: 'website' },
        { property: 'og:locale', content: 'en_US' },
        { property: 'og:image', content: `${SITE_URL}/og-image.png` },
        { property: 'og:image:type', content: 'image/png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:alt', content: 'Aminoprofile: compare the essential amino acids of foods, with data from USDA FoodData Central.' },
        { name: 'twitter:card', content: 'summary_large_image' },
      ],
      link: [
        // The sprout from the search results, filled, on the primary green (made by
        // scripts/make-favicons.py). sizes="32x32" on the .ico keeps Chrome from preferring it to
        // the SVG.
        { rel: 'icon', href: '/favicon.ico', sizes: '32x32' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/manifest.webmanifest' },
      ],
    },
  },

  // @pinia/nuxt auto-imports defineStore and acceptHMRUpdate itself.
  modules: ['@pinia/nuxt', 'nuxt-icons'],

  imports: {
    dirs: ['stores', 'types'],
  },

  css: [
    "@/assets/style/app.scss",
  ],

  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData:
          '@use "@/assets/style/_variables.scss" as *; @use "@/assets/style/_breakpoints.scss" as *;'
        },
      },
    },
  },

  devtools: { enabled: true },
  compatibilityDate: '2026-10-01',
})
