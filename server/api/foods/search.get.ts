// Food search, proxied through the server so the FoodData Central API key never reaches the
// browser. The browser calls /api/foods/search?query=..., this route asks USDA FoodData Central
// with the private key and passes the JSON on unchanged.
//
// - The query must be a single string of 2 to 100 characters; anything else is a 400.
// - The upstream call has a 10 second timeout and no retries.
// - Failures return a generic 502: no upstream status, message or body is passed on.
// - A small in-memory cache (per server instance) means a repeated search within ten minutes
//   does not use up the API quota again. A single search can return over a megabyte, so the
//   cache is capped both in entries and in total size, and it keeps the response text as is
//   (no parsing and re-serialising on every request).

const FDC_SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search'

const CACHE_TTL_MS = 10 * 60 * 1000
const CACHE_MAX_ENTRIES = 50
const CACHE_MAX_CHARS = 8 * 1024 * 1024
const cache = new Map<string, { at: number, json: string }>()
let cachedChars = 0

function forget(key: string) {
  const hit = cache.get(key)
  if (!hit) return
  cachedChars -= hit.json.length
  cache.delete(key)
}

function cached(key: string) {
  const hit = cache.get(key)
  if (!hit) return undefined
  if (Date.now() - hit.at >= CACHE_TTL_MS) {
    forget(key)
    return undefined
  }
  cache.delete(key)
  cache.set(key, hit) // most recently used goes to the back
  return hit.json
}

function remember(key: string, json: string) {
  if (json.length > CACHE_MAX_CHARS / 4) return
  forget(key)
  cache.set(key, { at: Date.now(), json })
  cachedChars += json.length
  while (cache.size > CACHE_MAX_ENTRIES || cachedChars > CACHE_MAX_CHARS) {
    forget(cache.keys().next().value!)
  }
}

export default defineEventHandler(async (event) => {
  const raw = getQuery(event).query
  const query = typeof raw === 'string' ? raw.trim() : ''

  if (query.length < 2 || query.length > 100) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid search' })
  }

  setResponseHeader(event, 'content-type', 'application/json; charset=utf-8')

  const hit = cached(query)
  if (hit) return hit

  // NUXT_FOODCENTRAL_API_KEY. Without it, USDA's shared DEMO_KEY is used, which is heavily
  // rate limited and only meant for trying things out.
  const key = useRuntimeConfig(event).foodcentralApiKey || 'DEMO_KEY'

  let json: string
  try {
    json = await $fetch<string>(`${FDC_SEARCH_URL}?api_key=${encodeURIComponent(key)}`, {
      method: 'POST',
      body: {
        query,
        dataType: ['Foundation'],
      },
      responseType: 'text',
      timeout: 10_000,
      retry: 0,
    })
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'Food database unavailable' })
  }
  if (typeof json !== 'string' || !json.startsWith('{')) {
    throw createError({ statusCode: 502, statusMessage: 'Food database unavailable' })
  }

  remember(query, json)
  return json
})
