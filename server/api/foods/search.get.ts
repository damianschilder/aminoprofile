// Food search, proxied through the server so the FoodData Central API key never reaches the
// browser. The page calls /api/foods/search?query=..., this route asks USDA FoodData Central
// with the private key (server/utils/foodData.ts) and answers with only the fields the page uses.
//
// - The query must be a single string of 2 to 100 characters after normalising (trimmed, single
//   spaces, lower case, no accents); anything else is a 400.
// - The upstream call has a 15 second timeout and no retries.
// - Failures return a generic 502, or a 503 when the API key's rate limit is reached. No upstream
//   status, message or body is passed on.
// - Answers are cached in memory, in Cloudflare's cache and in the browser (server/utils/searchCache.ts).

import { normaliseQuery } from '#shared/nutrients'

// The browser may reuse an answer for an hour; FoodData Central changes twice a year.
const BROWSER_CACHE = 'public, max-age=3600'

export default defineEventHandler(async (event) => {
  const query = normaliseQuery(getQuery(event).query)
  if (!query) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({ statusCode: 400, statusMessage: 'Invalid search' })
  }

  // NUXT_FOODCENTRAL_API_KEY. Without it, USDA's shared DEMO_KEY is used, which is heavily
  // rate limited and only meant for trying things out.
  const config = useRuntimeConfig(event)
  // Trimmed: a key pasted into `wrangler secret put` easily picks up a space or newline, and
  // USDA answers such a key with 403 API_KEY_INVALID (seen live on 2026-11-02).
  const apiKey = String(config.foodcentralApiKey ?? '').trim() || 'DEMO_KEY'
  const baseUrl = (config.foodcentralApiUrl || 'https://api.nal.usda.gov/fdc/v1').replace(/\/+$/, '')

  try {
    const { json, source } = await cachedSearch(event, query, async () =>
      JSON.stringify(await searchFoodData(query, apiKey, baseUrl)))
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
      throw createError({ statusCode: 503, statusMessage: 'Too many searches', data: { reason: 'busy' } })
    }
    if (!(error instanceof FoodDataError)) console.error('[foods/search]', error)
    throw createError({ statusCode: 502, statusMessage: 'Food database unavailable', data: { reason: 'unavailable' } })
  }
})
