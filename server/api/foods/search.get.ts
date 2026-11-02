// Food search, proxied through the server so the FoodData Central API key never reaches the
// browser. The page calls /api/foods/search?query=..., this route asks USDA FoodData Central
// with the private key (server/utils/foodData.ts) and answers with only the fields the page uses.
//
// Answers (stores/foods.ts shows each one):
// - 200 { query, totalHits, foods }, Cache-Control public, max-age=3600.
// - 400 when the query is not a single string of 2 to 100 characters after normalising (trimmed,
//   single spaces, lower case, no accents). The page checks the same rule before asking.
// - 503 with Retry-After (seconds, at most an hour) when the API key's rate limit is reached.
// - 502 for anything else: USDA unreachable, slower than 15 seconds, or an answer that is not
//   what it should be. No upstream status, message or body is passed on.
// Errors carry `data.reason` ('invalid', 'busy' or 'unavailable') and Cache-Control no-store.
// Answers are cached in memory, in Cloudflare's cache and in the browser (server/utils/searchCache.ts).

import { normaliseQuery, type SearchFailure } from '#shared/nutrients'

// The browser may reuse an answer for an hour; FoodData Central changes twice a year.
const BROWSER_CACHE = 'public, max-age=3600'

function fail(statusCode: number, statusMessage: string, reason: SearchFailure) {
  return createError({ statusCode, statusMessage, data: { reason } })
}

export default defineEventHandler(async (event) => {
  const query = normaliseQuery(getQuery(event).query)
  if (!query) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw fail(400, 'Invalid search', 'invalid')
  }

  try {
    const { json, source } = await cachedSearch(event, query, async () => {
      // Read only when USDA is actually asked, so a cached answer skips it.
      const config = useRuntimeConfig(event)
      // NUXT_FOODCENTRAL_API_KEY. Without it, USDA's shared DEMO_KEY is used, which is heavily
      // rate limited and only meant for trying things out. Trimmed: a key pasted into
      // `wrangler secret put` easily picks up a space or newline, and USDA answers such a key
      // with 403 API_KEY_INVALID (seen live on 2026-11-02).
      const apiKey = String(config.foodcentralApiKey ?? '').trim() || 'DEMO_KEY'
      const baseUrl = (config.foodcentralApiUrl || 'https://api.nal.usda.gov/fdc/v1').replace(/\/+$/, '')
      return JSON.stringify(await searchFoodData(query, apiKey, baseUrl))
    })
    setResponseHeaders(event, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': BROWSER_CACHE,
      'x-cache': source,
    })
    return json
  } catch (error) {
    setResponseHeader(event, 'cache-control', 'no-store')
    if (error instanceof FoodDataError && error.reason === 'busy') {
      setResponseHeader(event, 'retry-after', String(Math.min(error.retryAfter ?? 600, 3600)))
      throw fail(503, 'Too many searches', 'busy')
    }
    if (!(error instanceof FoodDataError)) console.error('[foods/search]', error)
    throw fail(502, 'Food database unavailable', 'unavailable')
  }
})
