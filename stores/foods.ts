import foodIndex from '#shared/food-index.json'
import { matchFoods } from '#shared/foodSearch'
import { ALL_NUTRIENTS, QUERY_MIN_LENGTH, type IndexFood, type NutrientKey, type NutrientValues } from '#shared/nutrients'
import { aminoAcidScores } from '#shared/scoring'

/** A food in the "Essential amino acids" table. */
export interface TableFood {
  id: string
  name: string
  /** Grams per 100 g, as the dataset has them. */
  values: NutrientValues
  /** What is typed in the amount field; empty means the placeholder, 100 g. */
  amount: string
}

export interface Total {
  /** Sum in grams over the ticked foods that have a value; null when none of them has one. */
  value: number | null
  /** False when at least one ticked food has no value, so the sum is a lower bound. */
  complete: boolean
}

/** A search result: a food of the dataset with its amino acid score on its own. */
export interface FoodResult extends IndexFood {
  /** Whole percent; null when an amino acid has no value. */
  score: number | null
}

const DEFAULT_GRAMS = 100

/** Grams typed in an amount field: empty is the 100 g placeholder, anything unusable counts as 100 g too. */
export function parseGrams(amount: string): number {
  const grams = Number.parseFloat(amount.replace(',', '.'))
  return Number.isFinite(grams) && grams >= 0 ? grams : DEFAULT_GRAMS
}

/** A nutrient value for the amount of a food in the table, or null when the dataset has none. */
export function valueFor(food: TableFood, key: NutrientKey): number | null {
  const per100 = food.values[key]
  return per100 === null ? null : (per100 * parseGrams(food.amount)) / 100
}

/** The score of 100 g of one food, as the food pages and /foods show it. */
function scoreOf(values: NutrientValues): number | null {
  const totals = Object.fromEntries(ALL_NUTRIENTS.map(({ key }) => [key, { value: values[key], complete: values[key] !== null }])) as Record<NutrientKey, Total>
  const { percent } = aminoAcidScores(totals).overall
  return percent === null ? null : Math.round(percent)
}

// The whole dataset ships with the page (shared/food-index.json, about 20 kB), so a search runs
// in the browser: nothing typed leaves it, and there is nothing to wait for.
const FOODS: FoodResult[] = (foodIndex.foods as IndexFood[]).map(food => ({ ...food, score: scoreOf(food.values) }))
const FOODS_BY_ID = new Map(FOODS.map(food => [food.id, food]))

export const FOOD_COUNT = FOODS.length

export const useFoodsStore = defineStore('foods', () => {
  /** What was searched for, as typed; results follow it as you type. */
  const searchQuery = ref('')
  const results = computed<FoodResult[]>(() => {
    const query = searchQuery.value.trim()
    return query.length < QUERY_MIN_LENGTH ? [] : matchFoods(FOODS, query)
  })
  /** A search long enough to run, whether or not it found anything. */
  const searched = computed(() => searchQuery.value.trim().length >= QUERY_MIN_LENGTH)

  const shownFoods = ref<TableFood[]>([])
  const selectedFoods = ref<Array<TableFood['id']>>([])

  function search(query: string) {
    searchQuery.value = query
  }

  function isShown(id: string) {
    return shownFoods.value.some(food => food.id === id)
  }

  function isSelected(id: string) {
    return selectedFoods.value.includes(id)
  }

  /** Add a food to the table, ticked. A food that is already there is ticked again. */
  function addFood(id: string): boolean {
    const food = FOODS_BY_ID.get(id)
    if (!food) return false
    if (!isShown(id)) shownFoods.value.push({ id, name: food.name, values: { ...food.values }, amount: '' })
    if (!isSelected(id)) selectedFoods.value.push(id)
    return true
  }

  function removeFood(id: string) {
    shownFoods.value = shownFoods.value.filter(food => food.id !== id)
    selectedFoods.value = selectedFoods.value.filter(other => other !== id)
  }

  function toggleFood(id: string) {
    if (isSelected(id)) selectedFoods.value = selectedFoods.value.filter(other => other !== id)
    else if (isShown(id)) selectedFoods.value.push(id)
  }

  function setAmount(id: string, amount: string) {
    const food = shownFoods.value.find(f => f.id === id)
    if (food) food.amount = amount
  }

  /**
   * The Total row: the ticked foods added up, each for its own amount. Also cystine and tyrosine,
   * which are not columns but count in the score.
   */
  const totals = computed(() => {
    const ticked = shownFoods.value.filter(food => selectedFoods.value.includes(food.id))
    return Object.fromEntries(ALL_NUTRIENTS.map(({ key }) => {
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

  /** The Score row: the amino acid score of the ticked foods together (shared/scoring.ts). */
  const scores = computed(() => aminoAcidScores(totals.value))

  return {
    searchQuery, results, searched, shownFoods, selectedFoods, totals, scores,
    search, isShown, isSelected, addFood, removeFood, toggleFood, setAmount,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useFoodsStore as any, import.meta.hot))
}
