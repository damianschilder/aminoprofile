// The nutrients Aminoprofile shows: the nine essential amino acids and protein, in the column
// order of the table. `id` is the FoodData Central nutrient id (nutrientId in search results),
// `number` the older USDA nutrient number (nutrientNumber), used as a fallback. All are in grams
// per 100 g of food.
//
// Shared by the server route (which picks these values out of the USDA response) and the page
// (which shows and adds them up), so both always agree on which value is which.

export const NUTRIENTS = [
  { key: 'his', label: 'His', name: 'Histidine', id: 1221, number: '512' },
  { key: 'ile', label: 'Ile', name: 'Isoleucine', id: 1212, number: '503' },
  { key: 'leu', label: 'Leu', name: 'Leucine', id: 1213, number: '504' },
  { key: 'lys', label: 'Lys', name: 'Lysine', id: 1214, number: '505' },
  { key: 'met', label: 'Met', name: 'Methionine', id: 1215, number: '506' },
  { key: 'phe', label: 'Phe', name: 'Phenylalanine', id: 1217, number: '508' },
  { key: 'thr', label: 'Thr', name: 'Threonine', id: 1211, number: '502' },
  { key: 'trp', label: 'Trp', name: 'Tryptophan', id: 1210, number: '501' },
  { key: 'val', label: 'Val', name: 'Valine', id: 1219, number: '510' },
  { key: 'protein', label: 'Protein', name: 'Protein', id: 1003, number: '203' },
] as const

export type NutrientKey = typeof NUTRIENTS[number]['key']

export const AMINO_ACID_KEYS = NUTRIENTS
  .filter(n => n.key !== 'protein')
  .map(n => n.key) as Exclude<NutrientKey, 'protein'>[]

/** Grams per 100 g; null when USDA has no value (which is not the same as 0). */
export type NutrientValues = Record<NutrientKey, number | null>

/**
 * One search result, as the server route sends it to the page. Every field is used: the name
 * and category columns, the nutrient count, the sprout (any amino acid value) and, once added,
 * the row in the amino acids table.
 */
export interface FoodResult {
  fdcId: number
  description: string
  category: string
  /** How many nutrients USDA has a value for. */
  nutrientCount: number
  values: NutrientValues
}

export interface SearchResponse {
  /**
   * The query as the server searched for it (trimmed, lower case, single spaces). The page does
   * not need it; it makes a cached answer say what it is the answer to.
   */
  query: string
  /** All matches in FoodData Central; `foods` holds the first page of them ("25 of 99 results"). */
  totalHits: number
  foods: FoodResult[]
}

/** Why /api/foods/search failed, in the `data.reason` of its JSON error body. */
export type SearchFailure = 'invalid' | 'busy' | 'unavailable'

export const QUERY_MIN_LENGTH = 2
export const QUERY_MAX_LENGTH = 100

/**
 * The form of a search term that is sent to the server and used as the cache key: accents
 * removed (FoodData Central descriptions are plain ASCII), lower case, single spaces. Returns
 * null when the result is shorter than 2 or longer than 100 characters.
 */
export function normaliseQuery(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length > 10 * QUERY_MAX_LENGTH) return null
  const query = raw
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
  if (query.length < QUERY_MIN_LENGTH || query.length > QUERY_MAX_LENGTH) return null
  return query
}

/** Grams with two decimals, as the table shows them, or 'N/a' when USDA has no value. */
export function formatGrams(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'N/a'
  return (Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2)
}

/** Whether a food has data for at least one essential amino acid. */
export function hasAminoAcids(values: NutrientValues): boolean {
  return AMINO_ACID_KEYS.some(key => values[key] !== null)
}
