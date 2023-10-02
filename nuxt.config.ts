// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  pages: true,
  runtimeConfig: {
    public: {
      foodDataKey: process.env.NUXT_PUBLIC_FOODCENTRAL_API_KEY
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
  modules: ['nuxt-icons', '@pinia/nuxt'],
  css: [
    "@/assets/style/app.scss", 
  ],
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData:
          '@import "@/assets/style/variables.scss";',
        },
      },
    },
  },
  devtools: { enabled: true },
  })
