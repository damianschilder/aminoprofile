// Caching for food searches, so a repeated search does not use the FoodData Central quota again
// (1,000 requests per hour for a real key, 30 for DEMO_KEY). Three layers, checked in order:
//
// 1. Memory of this server instance (a Worker isolate or the Node process): at most 200 searches
//    and about 4 MB of text, each kept for an hour, least recently used dropped first. One answer
//    is 5 to 10 kB, so this stays far below the 128 MB a Worker may use.
// 2. Cloudflare's cache in the data centre (the Workers Cache API, `caches.default`), kept for a
//    day. It only exists on Cloudflare; under Node this layer is skipped.
// 3. FoodData Central itself. Identical searches that arrive while one is already on its way wait
//    for that one instead of asking USDA again.
//
// The data changes twice a year, so a day is safe. Errors are never cached. Bump CACHE_VERSION
// when the shape of the answer changes, so no old answers are served after a deploy.

import type { H3Event } from 'h3'

// v3: the foods no longer carry `dataType`, which the page never used.
const CACHE_VERSION = 'v4'
const MEMORY_TTL_MS = 60 * 60 * 1000
const MEMORY_MAX_ENTRIES = 200
const MEMORY_MAX_CHARS = 4 * 1024 * 1024
const EDGE_TTL_SECONDS = 24 * 60 * 60

const memory = new Map<string, { at: number, json: string }>()
let memoryChars = 0
const inFlight = new Map<string, Promise<string>>()

function forget(key: string) {
  const hit = memory.get(key)
  if (!hit) return
  memoryChars -= hit.json.length
  memory.delete(key)
}

function fromMemory(key: string): string | undefined {
  const hit = memory.get(key)
  if (!hit) return undefined
  if (Date.now() - hit.at >= MEMORY_TTL_MS) {
    forget(key)
    return undefined
  }
  memory.delete(key)
  memory.set(key, hit) // most recently used goes to the back
  return hit.json
}

function remember(key: string, json: string) {
  if (json.length > MEMORY_MAX_CHARS / 8) return
  forget(key)
  memory.set(key, { at: Date.now(), json })
  memoryChars += json.length
  while (memory.size > MEMORY_MAX_ENTRIES || memoryChars > MEMORY_MAX_CHARS) {
    forget(memory.keys().next().value!)
  }
}

/** Cloudflare's `caches.default`, or undefined outside Workers (Node has no Cache API). */
function edgeCache(): Cache | undefined {
  const storage = (globalThis as { caches?: CacheStorage & { default?: Cache } }).caches
  return storage && typeof storage.default?.match === 'function' ? storage.default : undefined
}

export type CacheSource = 'memory' | 'edge' | 'upstream' | 'shared'

/**
 * The JSON text for `query`, from a cache or from `load`. `query` must already be normalised
 * (see normaliseQuery), so "Chicken  Breast" and "chicken breast" share one entry.
 */
export async function cachedSearch(
  event: H3Event,
  query: string,
  load: () => Promise<string>,
): Promise<{ json: string, source: CacheSource }> {
  const key = `${CACHE_VERSION}:${query}`
  const hit = fromMemory(key)
  if (hit !== undefined) return { json: hit, source: 'memory' }

  const pending = inFlight.get(key)
  if (pending) return { json: await pending, source: 'shared' }

  let source: CacheSource = 'upstream'
  const work = (async () => {
    const cache = edgeCache()
    const edgeKey = cache
      ? new Request(`${getRequestURL(event).origin}/__cache/foods-search/${CACHE_VERSION}?query=${encodeURIComponent(query)}`)
      : undefined
    if (cache && edgeKey) {
      try {
        const cached = await cache.match(edgeKey)
        if (cached) {
          source = 'edge'
          return await cached.text()
        }
      } catch {
        // A cache that does not answer is no reason to fail the search.
      }
    }
    const json = await load()
    if (cache && edgeKey) {
      const response = new Response(json, {
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': `public, max-age=${EDGE_TTL_SECONDS}`,
        },
      })
      event.waitUntil(cache.put(edgeKey, response).catch(() => {}))
    }
    return json
  })()

  inFlight.set(key, work)
  try {
    const json = await work
    remember(key, json)
    return { json, source }
  } finally {
    inFlight.delete(key)
  }
}
