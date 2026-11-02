// Preloads the two web fonts. Both are on the first screen of every page (Mulish for all text,
// Young Serif for the name in the header), and without this the browser only asks for them once
// the stylesheet has arrived and the page is laid out. `?url` gives the same hashed /_nuxt/ address
// the stylesheet uses, so each font is downloaded once and cached for a year. Server only: the
// links are in the HTML, and in the browser `?url` would add them a second time as full URLs.
import mulish from '~/assets/fonts/Mulish/Mulish-Latin.woff2?url'
import youngSerif from '~/assets/fonts/Young Serif/YoungSerif-Latin.woff2?url'

export default defineNuxtPlugin(() => {
  useHead({
    link: [mulish, youngSerif].map(href => ({ rel: 'preload', as: 'font', type: 'font/woff2', href, crossorigin: '' })),
  })
})
