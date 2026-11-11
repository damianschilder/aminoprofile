// What the food pages show (pages/foods/index.vue and pages/foods/[id].vue), worked out on the
// server from shared/foods.json, so the browser only gets the one food it shows and not the whole
// dataset. Served by server/api/dataset/foods.get.ts and server/api/dataset/foods/[id].get.ts.
//
// Every number here comes from the dataset and the FAO (2013) pattern in shared/scoring.ts. The
// pages turn them into sentences, so a page says nothing the data does not.

import foodsData from '#shared/foods.json'
import type { NutrientKey } from '#shared/nutrients'
import { aminoAcidScores, SCORING_PATTERN, type ScoredKey } from '#shared/scoring'

type AminoAcidKey = Exclude<NutrientKey, 'protein'>

interface DatasetFood {
  id: string
  name: string
  category: string
  aliases: string[]
  values: Record<NutrientKey, number | null>
  quality: { origins: string[], independentSources: number, maxSpread: number | null, estimated: string[] }
  sources: string[]
  entries: { source: string, id: string, name: string, relation: string }[]
  byOrigin: Record<AminoAcidKey, Record<string, number>>
}

const DATASET_FOODS = foodsData.foods as DatasetFood[]
const ORIGIN_NAMES = foodsData.originNames as Record<string, string>

/** The source databases, as a page names them. */
const SOURCE_NAMES: Record<string, string> = {
  usda: 'USDA FoodData Central, SR Legacy',
  bls: 'Bundeslebensmittelschlüssel (BLS) 4.0',
  frida: 'Frida 5.5 (DTU)',
  mext: 'MEXT amino acid tables (Japan)',
}

/**
 * The public page of a source entry, where one could be confirmed (10 November 2026). MEXT's
 * food database has one per food number: the food group (the first two digits), the number and
 * "_7", as in ITEM_NO=12_12004_7 for a raw egg. USDA's food-details address answered 404, Frida's
 * pages render in the browser so the food could not be checked, and BLS has none by code, so
 * those show their id only.
 */
function entryUrl(source: string, id: string): string | null {
  if (source === 'mext' && /^\d{5}$/.test(id)) return `https://fooddb.mext.go.jp/details/details.pl?ITEM_NO=${Number(id.slice(0, 2))}_${id}_7`
  return null
}

const AMINO_ACIDS: { key: AminoAcidKey, name: string, essential: boolean }[] = [
  { key: 'his', name: 'Histidine', essential: true },
  { key: 'ile', name: 'Isoleucine', essential: true },
  { key: 'leu', name: 'Leucine', essential: true },
  { key: 'lys', name: 'Lysine', essential: true },
  { key: 'met', name: 'Methionine', essential: true },
  { key: 'cys', name: 'Cystine', essential: false },
  { key: 'phe', name: 'Phenylalanine', essential: true },
  { key: 'tyr', name: 'Tyrosine', essential: false },
  { key: 'thr', name: 'Threonine', essential: true },
  { key: 'trp', name: 'Tryptophan', essential: true },
  { key: 'val', name: 'Valine', essential: true },
]

const round = (value: number, decimals: number) => Math.round(value * 10 ** decimals) / 10 ** decimals

/** The amount of protein a combination on a page is worked out for. */
const COMBINATION_PROTEIN_GRAMS = 20
/** The most of the other food a combination may ask for (300 g of milk is a large glass). */
const MAX_COMBINATION_GRAMS = 300

/** mg of each scored amino acid (with its partner) per g protein, or null without full data. */
function profileOf(food: DatasetFood): Record<ScoredKey, number> | null {
  const protein = food.values.protein
  if (!protein) return null
  const profile = {} as Record<ScoredKey, number>
  for (const item of SCORING_PATTERN) {
    const own = food.values[item.key]
    const partner = 'partner' in item ? food.values[item.partner] : 0
    if (own === null || partner === null) return null
    profile[item.key] = ((own + partner) * 1000) / protein
  }
  return profile
}

/** Score of a profile: the lowest share of the pattern, and which amino acids have it. */
function scoreOf(profile: Record<ScoredKey, number>): { percent: number, limiting: ScoredKey[] } {
  const shares = SCORING_PATTERN.map(item => ({ key: item.key, percent: (profile[item.key] / item.mgPerG) * 100 }))
  const lowest = Math.min(...shares.map(s => s.percent))
  return { percent: lowest, limiting: shares.filter(s => s.percent - lowest < 1e-9).map(s => s.key) }
}

const patternName = (key: ScoredKey) => SCORING_PATTERN.find(item => item.key === key)!.name

const PROFILES = new Map(DATASET_FOODS.map(food => [food.id, profileOf(food)]))
const SCORES = new Map(DATASET_FOODS.map(food => {
  const profile = PROFILES.get(food.id)
  return [food.id, profile ? scoreOf(profile) : null]
}))

export interface FoodListItem {
  id: string
  name: string
  category: string
  protein: number | null
  /** Whole percent, or null when an amino acid has no value. */
  score: number | null
  limiting: string[]
  independentSources: number
}

export interface FoodList {
  version: string
  count: number
  categories: { name: string, foods: FoodListItem[] }[]
}

function listItem(food: DatasetFood): FoodListItem {
  const score = SCORES.get(food.id)
  return {
    id: food.id,
    name: food.name,
    category: food.category,
    protein: food.values.protein,
    score: score ? Math.round(score.percent) : null,
    limiting: score && score.percent < 100 ? score.limiting.map(patternName) : [],
    independentSources: food.quality.independentSources,
  }
}

/** All foods, by category in the dataset's order. */
export function foodList(): FoodList {
  const categories = [...new Set(DATASET_FOODS.map(food => food.category))]
  return {
    version: foodsData.version,
    count: DATASET_FOODS.length,
    categories: categories.map(name => ({ name, foods: DATASET_FOODS.filter(food => food.category === name).map(listItem) })),
  }
}

export interface Combination {
  id: string
  name: string
  /** Score of the two together, half of the protein from each. */
  score: number
  limiting: string[]
  /** Grams of this page's food and of the other food that give 20 g protein together. */
  gramsOfThis: number
  gramsOfOther: number
}

export interface FoodPage {
  id: string
  name: string
  category: string
  aliases: string[]
  protein: number | null
  aminoAcids: {
    key: string
    name: string
    essential: boolean
    grams: number | null
    /** mg per g protein. */
    perGramProtein: number | null
    /** mg per g nitrogen per origin, and how far they are apart (share of the median). */
    byOrigin: { origin: string, mgPerGramNitrogen: number }[]
    spread: number | null
  }[]
  /** Per amino acid of the FAO pattern: mg per g protein (with its partner) and the share. */
  pattern: { key: string, partner: string | null, name: string, mgPerG: number | null, needed: number, percent: number | null }[]
  score: { percent: number, limiting: string[] } | null
  origins: string[]
  independentSources: number
  maxSpread: number | null
  estimated: string[]
  entries: { source: string, id: string, name: string, relation: string, url: string | null }[]
  /** For a food under 100%: what lifts it most. For one at 100% or more: what it lifts most. */
  combinations: { kind: 'lifted-by' | 'lifts', foods: Combination[] }
  sameCategory: { id: string, name: string }[]
  version: string
}

/** Grams of each food that give `total` g protein together, half from each. */
const gramsFor = (protein: number, total: number) => Math.round(((total / 2) / protein) * 100)

function combinationsFor(food: DatasetFood): FoodPage['combinations'] {
  const own = PROFILES.get(food.id)
  const ownScore = SCORES.get(food.id)
  if (!own || !ownScore || !food.values.protein) return { kind: 'lifted-by', foods: [] }
  const kind = ownScore.percent < 100 ? 'lifted-by' : 'lifts'
  const candidates = DATASET_FOODS
    .filter(other => other.id !== food.id && other.category !== food.category && other.values.protein)
    // Not vegetables: their nitrogen is partly not protein (nitrate, chitin), so their score comes
    // out too low and they would top the "lifts" list for that reason alone (data/README.md,
    // known limits). And only amounts someone eats: at most 300 g for half the protein.
    .filter(other => other.category !== 'Vegetables' && gramsFor(other.values.protein!, COMBINATION_PROTEIN_GRAMS) <= MAX_COMBINATION_GRAMS)
    .flatMap((other) => {
      const theirs = PROFILES.get(other.id)
      const theirScore = SCORES.get(other.id)
      if (!theirs || !theirScore) return []
      const mixed = {} as Record<ScoredKey, number>
      for (const item of SCORING_PATTERN) mixed[item.key] = (own[item.key] + theirs[item.key]) / 2
      const together = scoreOf(mixed)
      // Lifted by: the highest score together. Lifts: the largest rise over the other food alone,
      // among foods under 100% on their own.
      const rank = kind === 'lifted-by' ? together.percent : (theirScore.percent < 100 ? together.percent - theirScore.percent : -Infinity)
      return [{ other, together, rank }]
    })
    .filter(c => c.rank > -Infinity)
    .sort((a, b) => b.rank - a.rank)
  // At most one food per category, so the suggestions are not three kinds of beans.
  const seen = new Set<string>()
  const picked = candidates.filter((c) => {
    if (seen.has(c.other.category)) return false
    seen.add(c.other.category)
    return true
  }).slice(0, 3)
  return {
    kind,
    foods: picked.map(c => ({
      id: c.other.id,
      name: c.other.name,
      score: Math.round(c.together.percent),
      limiting: c.together.percent < 100 ? c.together.limiting.map(patternName) : [],
      gramsOfThis: gramsFor(food.values.protein!, COMBINATION_PROTEIN_GRAMS),
      gramsOfOther: gramsFor(c.other.values.protein!, COMBINATION_PROTEIN_GRAMS),
    })),
  }
}

/** Everything the page of one food shows, or null for an unknown id. */
export function foodPage(id: string): FoodPage | null {
  const food = DATASET_FOODS.find(f => f.id === id)
  if (!food) return null
  const protein = food.values.protein
  const totals = Object.fromEntries(Object.entries(food.values).map(([k, v]) => [k, { value: v, complete: v !== null }])) as Parameters<typeof aminoAcidScores>[0]
  const scores = aminoAcidScores(totals)
  const score = SCORES.get(food.id)
  return {
    id: food.id,
    name: food.name,
    category: food.category,
    aliases: food.aliases,
    protein,
    aminoAcids: AMINO_ACIDS.map((aa) => {
      const byOrigin = Object.entries(food.byOrigin[aa.key] ?? {}).map(([origin, mg]) => ({ origin: ORIGIN_NAMES[origin] ?? origin, mgPerGramNitrogen: mg }))
      const values = byOrigin.map(o => o.mgPerGramNitrogen).sort((a, b) => a - b)
      const middle = values.length ? (values[(values.length - 1) >> 1]! + values[values.length >> 1]!) / 2 : 0
      const grams = food.values[aa.key]
      return {
        key: aa.key,
        name: aa.name,
        essential: aa.essential,
        grams,
        perGramProtein: grams !== null && protein ? Math.round((grams * 1000) / protein) : null,
        byOrigin,
        spread: values.length >= 2 && middle > 0 ? round((values.at(-1)! - values[0]!) / middle, 2) : null,
      }
    }),
    pattern: SCORING_PATTERN.map((item) => {
      const s = scores.byKey[item.key]
      return {
        key: item.key,
        partner: 'partner' in item ? item.partner : null,
        name: item.name,
        mgPerG: s.mgPerG === null ? null : Math.round(s.mgPerG),
        needed: item.mgPerG,
        percent: s.percent === null ? null : Math.round(s.percent),
      }
    }),
    score: score ? { percent: Math.round(score.percent), limiting: score.percent < 100 ? score.limiting.map(patternName) : [] } : null,
    origins: food.quality.origins.map(o => ORIGIN_NAMES[o] ?? o),
    independentSources: food.quality.independentSources,
    maxSpread: food.quality.maxSpread,
    estimated: food.quality.estimated,
    entries: food.entries.map(e => ({ source: SOURCE_NAMES[e.source] ?? e.source, id: e.id, name: e.name, relation: e.relation, url: entryUrl(e.source, e.id) })),
    combinations: combinationsFor(food),
    sameCategory: DATASET_FOODS.filter(f => f.category === food.category && f.id !== food.id).map(f => ({ id: f.id, name: f.name })),
    version: foodsData.version,
  }
}

/** Every food id, for the sitemap. */
export const FOOD_PAGE_IDS = DATASET_FOODS.map(food => food.id)
