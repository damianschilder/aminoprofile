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
      wrangler: { name: 'aminoprofile' },
    },
  },

  runtimeConfig: {
    // NUXT_FOODCENTRAL_API_KEY: the USDA FoodData Central API key. Server-only, never sent to the
    // browser. Empty means USDA's rate-limited DEMO_KEY (see server/api/foods/search.get.ts).
    foodcentralApiKey: '',
    public: {
      gtagId: process.env.NUXT_PUBLIC_GTAG_ID
    }
  },

  app: {
    head: {
      title: "Aminoprofile",
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
