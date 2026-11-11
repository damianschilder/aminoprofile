// The sitemap, made from the pages and the dataset so a new food gets its address without a
// hand edit. Replaces the old public/sitemap.xml.

import { SITE_URL } from '#shared/site'
import { FOOD_PAGE_IDS } from '../utils/foodPages'

const PATHS = ['/', '/foods', ...FOOD_PAGE_IDS.map(id => `/foods/${id}`), '/data', '/sources', '/privacy']

const BODY = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...PATHS.map(path => `  <url><loc>${SITE_URL}${path}</loc></url>`),
  '</urlset>',
  '',
].join('\n')

export default defineEventHandler((event) => {
  setResponseHeaders(event, {
    'content-type': 'application/xml; charset=utf-8',
    'cache-control': 'public, max-age=3600',
  })
  return BODY
})
