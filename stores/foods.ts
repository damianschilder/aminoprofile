import {
  NUTRIENTS,
  hasAminoAcids,
  normaliseQuery,
  type FoodResult,
  type NutrientKey,
  type NutrientValues,
  type SearchResponse,
} from '#shared/nutrients'

/** A food in the "Essential amino acids" table. */
export interface TableFood {
  fdcId: number
  description: string
  /** Grams per 100 g, as USDA gives them. */
  values: NutrientValues
  /** What is typed in the amount field; empty means the placeholder, 100 g. */
  amount: string
}

export type SearchStatus = 'idle' | 'loading' | 'done' | 'error'
export type SearchError = 'too-short' | 'busy' | 'unavailable'

export interface Total {
  /** Sum in grams over the ticked foods that have a value; null when none of them has one. */
  value: number | null
  /** False when at least one ticked food has no value, so the sum is a lower bound. */
  complete: boolean
}

const DEFAULT_GRAMS = 100

/** Grams typed in an amount field: empty is the 100 g placeholder, anything unusable counts as 100 g too. */
export function parseGrams(amount: string): number {
  const grams = Number.parseFloat(amount.replace(',', '.'))
  return Number.isFinite(grams) && grams >= 0 ? grams : DEFAULT_GRAMS
}

/** A nutrient value for the amount of a food in the table, or null when USDA has none. */
export function valueFor(food: TableFood, key: NutrientKey): number | null {
  const per100 = food.values[key]
  return per100 === null ? null : (per100 * parseGrams(food.amount)) / 100
}

export const useFoodsStore = defineStore('foods', () => {
  const status = ref<SearchStatus>('idle')
  const errorReason = ref<SearchError | null>(null)
  /** The normalised query of the results shown (or being loaded). */
  const searchQuery = ref('')
  const results = ref<FoodResult[]>([])
  const responseHits = ref<number | null>(null)
  const shownFoods = ref<TableFood[]>([])
  const selectedFoods = ref<Array<TableFood['fdcId']>>([])

  const loading = computed(() => status.value === 'loading')
  const error = computed(() => status.value === 'error')

  // Only the latest search may change the results: starting a new one aborts the previous one,
  // and an answer that arrives for an older search is ignored.
  let controller: AbortController | null = null

  async function searchFoods(raw: string) {
    const query = normaliseQuery(raw)
    if (!query) {
      controller?.abort()
      controller = null
      status.value = 'error'
      errorReason.value = 'too-short'
      return
    }
    // Pressing Enter again on the same search does not ask the server again.
    if (query === searchQuery.value && (status.value === 'loading' || status.value === 'done')) return

    controller?.abort()
    const own = new AbortController()
    controller = own
    searchQuery.value = query
    status.value = 'loading'
    errorReason.value = null
    // Give up after 25 s (the server itself waits at most 15 s for USDA). $fetch ignores its own
    // `timeout` option when a signal is passed, so the timer aborts the same controller.
    const timer = setTimeout(() => own.abort(), 25_000)
    try {
      // The server route asks FoodData Central with the private API key (server/api/foods/search.get.ts).
      const response = await $fetch<SearchResponse>('/api/foods/search', {
        query: { query },
        signal: own.signal,
        retry: 0,
      })
      if (controller !== own) return
      results.value = Array.isArray(response?.foods) ? response.foods : []
      responseHits.value = typeof response?.totalHits === 'number' ? response.totalHits : results.value.length
      status.value = 'done'
    } catch (e: any) {
      if (controller !== own) return
      results.value = []
      responseHits.value = null
      status.value = 'error'
      errorReason.value = e?.statusCode === 503 || e?.data?.data?.reason === 'busy' ? 'busy' : 'unavailable'
    } finally {
      clearTimeout(timer)
      if (controller === own) controller = null
    }
  }

  function isShown(fdcId: number) {
    return shownFoods.value.some(food => food.fdcId === fdcId)
  }

  function isSelected(fdcId: number) {
    return selectedFoods.value.includes(fdcId)
  }

  /** Add a search result to the table, ticked. A food that is already there is ticked again. */
  function addFood(food: FoodResult): boolean {
    if (!hasAminoAcids(food.values)) return false
    if (!isShown(food.fdcId)) {
      shownFoods.value.push({ fdcId: food.fdcId, description: food.description, values: { ...food.values }, amount: '' })
    }
    if (!isSelected(food.fdcId)) selectedFoods.value.push(food.fdcId)
    return true
  }

  function removeFood(fdcId: number) {
    shownFoods.value = shownFoods.value.filter(food => food.fdcId !== fdcId)
    selectedFoods.value = selectedFoods.value.filter(id => id !== fdcId)
  }

  function toggleFood(fdcId: number) {
    if (isSelected(fdcId)) selectedFoods.value = selectedFoods.value.filter(id => id !== fdcId)
    else if (isShown(fdcId)) selectedFoods.value.push(fdcId)
  }

  function setAmount(fdcId: number, amount: string) {
    const food = shownFoods.value.find(f => f.fdcId === fdcId)
    if (food) food.amount = amount
  }

  /** The Total row: the ticked foods added up, each for its own amount. */
  const totals = computed(() => {
    const ticked = shownFoods.value.filter(food => selectedFoods.value.includes(food.fdcId))
    return Object.fromEntries(NUTRIENTS.map(({ key }) => {
      let sum = 0
      let known = 0
      for (const food of ticked) {
        const value = valueFor(food, key)
        if (value === null) continue
        sum += value
        known++
      }
      return [key, { value: known ? sum : null, complete: known === ticked.length }]
    })) as Record<NutrientKey, Total>
  })

  return {
    status, errorReason, searchQuery, results, responseHits, shownFoods, selectedFoods, loading, error, totals,
    searchFoods, isShown, isSelected, addFood, removeFood, toggleFood, setAmount,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useFoodsStore as any, import.meta.hot))
}
