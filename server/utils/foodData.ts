// Searching USDA FoodData Central and turning its answer into the small list the page needs.
//
// A FoodData Central search returns every nutrient of every food: close to a megabyte for 25
// foods. The page only uses a name, a category, a nutrient count and ten values per food, so the
// server picks those out (by nutrient id, with the nutrient number as a fallback, converted to
// grams) and sends about 1% of the original. Missing values stay null: "no data" is not "0 g".

import {
  NUTRIENTS,
  hasAminoAcids,
  type FoodResult,
  type NutrientKey,
  type NutrientValues,
  type SearchResponse,
} from '#shared/nutrients'

// Foundation Foods and SR Legacy are the two data sets with amino acid data. In the October 2026
// release 118 of the 424 Foundation foods have it, and about 5,100 of the 7,793 SR Legacy foods.
// Survey (FNDDS) and Branded foods have none, so they are not searched.
export const FDC_DATA_TYPES = ['Foundation', 'SR Legacy']
// USDA sends every nutrient of every food, about 35 kB per SR Legacy food. Just parsing 50 of them
// (1.7 MB) took 7 to 10 ms of CPU in V8, the whole CPU budget of a request on the Workers Free
// plan; 25 foods take 3 to 4 ms. The page says "25 of 99 results" when there are more.
export const FDC_PAGE_SIZE = 25
const FDC_TIMEOUT_MS = 15_000

export class FoodDataError extends Error {
  constructor(
    /** 'busy': the API key's rate limit was reached. 'unavailable': anything else. */
    readonly reason: 'busy' | 'unavailable',
    /** Seconds, from the Retry-After header of a 429. */
    readonly retryAfter?: number,
  ) {
    super(`FoodData Central ${reason}`)
  }
}

const GRAMS_PER_UNIT: Record<string, number> = { g: 1, mg: 1e-3, ug: 1e-6, 'µg': 1e-6, 'μg': 1e-6 }
const KEY_BY_ID = new Map<number, NutrientKey>(NUTRIENTS.map(n => [n.id, n.key]))
const KEY_BY_NUMBER = new Map<string, NutrientKey>(NUTRIENTS.map(n => [n.number, n.key]))

function emptyValues(): NutrientValues {
  return Object.fromEntries(NUTRIENTS.map(n => [n.key, null])) as NutrientValues
}

function toNumber(raw: unknown): number {
  if (typeof raw === 'number') return raw
  if (typeof raw === 'string' && raw.trim() !== '') return Number(raw)
  return Number.NaN
}

/**
 * The ten values Aminoprofile shows, in grams per 100 g, and how many nutrients have a value.
 * Accepts both the search-result shape ({ nutrientId, nutrientNumber, unitName, value }) and the
 * full food record shape ({ nutrient: { id, number, unitName }, amount }).
 */
export function pickNutrients(list: unknown): { values: NutrientValues, count: number } {
  const values = emptyValues()
  if (!Array.isArray(list)) return { values, count: 0 }
  const seen = new Set<string>()
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const n = item as Record<string, any>
    const amount = toNumber(n.value ?? n.amount)
    if (!Number.isFinite(amount) || amount < 0) continue
    const id = toNumber(n.nutrientId ?? n.nutrient?.id)
    const number = String(n.nutrientNumber ?? n.nutrient?.number ?? '').trim()
    seen.add(Number.isFinite(id) ? `id ${id}` : `number ${number}`)
    const key = Number.isFinite(id) ? KEY_BY_ID.get(id) : KEY_BY_NUMBER.get(number)
    if (!key || values[key] !== null) continue
    const factor = GRAMS_PER_UNIT[String(n.unitName ?? n.nutrient?.unitName ?? 'g').toLowerCase()]
    if (factor === undefined) continue
    values[key] = Math.round(amount * factor * 1e6) / 1e6
  }
  return { values, count: seen.size }
}

function text(raw: unknown): string {
  return typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim() : ''
}

interface Candidate extends FoodResult {
  /** Description plus USDA's other names for the food, for ranking only. */
  searchText: string
}

function toCandidate(raw: unknown): Candidate | null {
  if (!raw || typeof raw !== 'object') return null
  const food = raw as Record<string, any>
  const fdcId = Number(food.fdcId)
  const description = text(food.description)
  if (!Number.isSafeInteger(fdcId) || fdcId <= 0 || !description) return null
  const category = text(food.foodCategory) || text(food.foodCategory?.description) || text(food.brandedFoodCategory)
  const { values, count } = pickNutrients(food.foodNutrients)
  return {
    fdcId,
    description,
    category,
    dataType: text(food.dataType),
    nutrientCount: count,
    values,
    searchText: [description, text(food.commonNames), text(food.additionalDescriptions)].join(' '),
  }
}

function words(value: string): string[] {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    // "eggs" finds "egg", "lentil" finds "lentils"
    .map(w => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w))
}

/**
 * Foods with amino acid data first (as the page always did), then foods whose names contain
 * every word that was searched for, and otherwise FoodData Central's own relevance order.
 */
export function rankFoods<T extends Candidate>(foods: T[], query: string): T[] {
  const wanted = query.split(' ').filter(w => !w.startsWith('-')).flatMap(words)
  return foods
    .map((food, index) => {
      const have = words(food.searchText)
      return {
        food,
        index,
        noAminoAcids: hasAminoAcids(food.values) ? 0 : 1,
        missingWords: wanted.filter(w => !have.some(h => h.startsWith(w))).length,
      }
    })
    .sort((a, b) => a.noAminoAcids - b.noAminoAcids || a.missingWords - b.missingWords || a.index - b.index)
    .map(r => r.food)
}

async function fetchPage(query: string, requireAllWords: boolean, apiKey: string, baseUrl: string) {
  let response: Response
  try {
    response = await fetch(`${baseUrl}/foods/search?api_key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ query, dataType: FDC_DATA_TYPES, pageSize: FDC_PAGE_SIZE, requireAllWords }),
      signal: AbortSignal.timeout(FDC_TIMEOUT_MS),
    })
  } catch {
    throw new FoodDataError('unavailable')
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => {})
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get('retry-after'))
      throw new FoodDataError('busy', Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined)
    }
    // The status only (never the key or the query), so `wrangler tail` shows why a search failed:
    // 403 means the API key is wrong.
    console.error(`[foods/search] FoodData Central answered HTTP ${response.status}`)
    throw new FoodDataError('unavailable')
  }
  let body: any
  try {
    body = await response.json()
  } catch {
    throw new FoodDataError('unavailable')
  }
  if (!body || typeof body !== 'object' || !Array.isArray(body.foods)) throw new FoodDataError('unavailable')
  return { totalHits: Number(body.totalHits) || 0, foods: body.foods as unknown[] }
}

/**
 * Search FoodData Central. All words must match; only when that finds nothing for a query of
 * several words (a typo in one of them, say) is the search repeated with any word matching.
 */
export async function searchFoodData(query: string, apiKey: string, baseUrl: string): Promise<SearchResponse> {
  let page = await fetchPage(query, true, apiKey, baseUrl)
  if (page.totalHits === 0 && query.includes(' ')) page = await fetchPage(query, false, apiKey, baseUrl)

  const seen = new Set<number>()
  const candidates: Candidate[] = []
  for (const raw of page.foods) {
    const food = toCandidate(raw)
    if (!food || seen.has(food.fdcId)) continue
    seen.add(food.fdcId)
    candidates.push(food)
  }
  const foods = rankFoods(candidates, query).map(({ searchText, ...food }) => food)
  return { query, totalHits: Math.max(page.totalHits, foods.length), foods }
}
