// https://nuxt.com/docs/api/configuration/nuxt-config
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
        vars: { NUXT_CANONICAL_HOST: 'aminoprofile.com' },
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
  },

  app: {
    head: {
      title: "Aminoprofile",
      htmlAttrs: { lang: 'en' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
      link: [{ rel: 'icon', type: 'image/png', href: '/favicon.png' }]
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
