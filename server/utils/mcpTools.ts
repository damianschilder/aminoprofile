// The tools of the agent endpoint (server/routes/mcp.ts): search the curated foods, read one food
// and score a combination of foods. Plain functions over shared/foods.json and shared/scoring.ts,
// so they can be checked without the MCP transport around them. The route registers them with
// the input and output schemas below.
//
// Field names are snake_case and spelled out (lysine, not lys), because an agent reads them
// without the page's table headers to explain them. Grams are rounded to 3 decimals and percents
// to whole numbers, as the page shows them.

import * as z from 'zod'
import foodsData from '#shared/foods.json'
import { matchFoods as matchFoodsIn, searchWords } from '#shared/foodSearch'
import type { NutrientKey } from '#shared/nutrients'
import { aminoAcidScores, SCORING_PATTERN } from '#shared/scoring'

// Zod can compile its checks with `new Function`, which Cloudflare Workers forbid. It would
// notice and fall back, but jitless skips the attempt.
z.config({ jitless: true })

export const DATASET_VERSION: string = foodsData.version
export const DATA_PAGE_URL = 'https://aminoprofile.com/data'
export const DATASET_URL = 'https://aminoprofile.com/data/aminoprofile-foods.json'
export const METHOD_URL = 'https://github.com/damianschilder/aminoprofile/blob/main/data/README.md'
export const LICENCE = 'CC BY 4.0'
export const MCP_ENDPOINT_URL = 'https://aminoprofile.com/mcp'

/**
 * The protocol revisions /mcp serves, newest first: 2026-07-28 through `server/discover`, the
 * others through `initialize`. The route and the server card both read this list.
 */
export const MCP_PROTOCOL_VERSIONS = ['2026-07-28', '2025-11-25', '2025-06-18', '2025-03-26']

interface Food {
  id: string
  name: string
  category: string
  aliases: string[]
  values: Record<NutrientKey, number | null>
  quality: { origins: string[], independentSources: number, maxSpread: number | null, estimated: string[] }
  sources: string[]
}

const FOODS = foodsData.foods as Food[]
const FOODS_BY_ID = new Map(FOODS.map(food => [food.id, food]))
export const CATEGORIES = [...new Set(FOODS.map(food => food.category))]
export const FOOD_COUNT = FOODS.length

/** The dataset's short keys and the names the tools answer with, protein first. */
const AMOUNT_NAMES = {
  protein: 'protein',
  his: 'histidine',
  ile: 'isoleucine',
  leu: 'leucine',
  lys: 'lysine',
  met: 'methionine',
  cys: 'cystine',
  phe: 'phenylalanine',
  tyr: 'tyrosine',
  thr: 'threonine',
  trp: 'tryptophan',
  val: 'valine',
} as const satisfies Record<NutrientKey, string>

type AmountName = typeof AMOUNT_NAMES[NutrientKey]
type Amounts = Record<AmountName, number | null>
type PatternName = typeof SCORING_PATTERN[number]['name']

const round = (value: number, decimals: number) => Math.round(value * 10 ** decimals) / 10 ** decimals
const roundGrams = (value: number | null) => (value === null ? null : round(value, 3))

function namedAmounts(values: Record<NutrientKey, number | null>): Amounts {
  const amounts = {} as Amounts
  for (const [key, name] of Object.entries(AMOUNT_NAMES) as [NutrientKey, AmountName][]) {
    amounts[name] = roundGrams(values[key])
  }
  return amounts
}

/** "87%", "at least 87%" or "no score", for the text answers. */
function describePercent(percent: number | null, atLeast: boolean): string {
  if (percent === null) return 'no score'
  return `${atLeast ? 'at least ' : ''}${percent}%`
}

// --- Searching -------------------------------------------------------------------------------

// The word rules and the ranking are the home page's (shared/foodSearch.ts), so an agent finds
// what a person would.
const SEARCH_INDEX = FOODS.map(food => ({
  food,
  allWords: searchWords([food.name, ...food.aliases, food.id].join(' ')),
}))

const matchFoods = (query: string, category?: string): Food[] => matchFoodsIn(FOODS, query, category)

function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(previous[j]! + 1, current[j - 1]! + 1, previous[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    previous = current
  }
  return previous[b.length]!
}

/**
 * Up to five ids an agent may have meant: foods that share a word with the unknown id first
 * ("egg" finds the egg foods), then the ids that are fewest typing changes away.
 */
export function closeFoodIds(unknown: string, count = 5): string[] {
  const wanted = searchWords(unknown)
  const target = unknown.trim().toLowerCase()
  return SEARCH_INDEX
    .map(entry => ({
      id: entry.food.id,
      sharedWords: wanted.filter(w => entry.allWords.some(h => h.startsWith(w))).length,
      distance: editDistance(target, entry.food.id),
    }))
    .sort((a, b) => b.sharedWords - a.sharedWords || a.distance - b.distance)
    .slice(0, count)
    .map(c => c.id)
}

function findFood(id: string): Food | undefined {
  return FOODS_BY_ID.get(id.trim().toLowerCase())
}

// --- Tool results ----------------------------------------------------------------------------

interface ToolResult<T> {
  content: { type: 'text', text: string }[]
  structuredContent?: T
  isError?: boolean
}

function ok<T>(text: string, structuredContent: T): ToolResult<T> {
  return { content: [{ type: 'text', text }], structuredContent }
}

function failure(text: string): ToolResult<never> {
  return { content: [{ type: 'text', text }], isError: true }
}

const unknownIdText = (id: string) =>
  `No food with id "${id}". Close ids: ${closeFoodIds(id).join(', ')}. Use search_foods to find an id.`

// --- Schemas ---------------------------------------------------------------------------------

const grams = z.number().nullable()

const amountsSchema = z.object(
  Object.fromEntries(Object.values(AMOUNT_NAMES).map(name => [name, grams])) as Record<AmountName, typeof grams>,
)

const overallScoreSchema = {
  percent: z.number().nullable().describe('Amino acid score in percent of the FAO (2013) pattern; null when it cannot be scored'),
  at_least: z.boolean().describe('True when a value is missing, so the real score is at least this'),
  limiting: z.array(z.string()).describe('The amino acid(s) with the lowest score'),
}

export const searchFoodsInput = {
  query: z.string().max(100).optional().describe('Words to look for in the name, aliases and id, e.g. "cheese" or "red lentils". Empty lists all foods.'),
  category: z.string().max(100).optional().describe(`One of: ${CATEGORIES.join(', ')}`),
  limit: z.number().int().min(1).max(500).optional().describe('Most foods to return, 1 to 500 (default 10)'),
}

export const searchFoodsOutput = {
  foods: z.array(z.object({
    id: z.string(),
    name: z.string(),
    category: z.string(),
    protein_g_per_100g: grams,
    independent_sources: z.number().int(),
  })),
  total: z.number().int().describe('All matching foods, also those beyond the limit'),
}

export const getFoodInput = {
  id: z.string().max(100).describe('A food id from search_foods, e.g. "egg-whole-raw"'),
}

export const getFoodOutput = {
  id: z.string(),
  name: z.string(),
  category: z.string(),
  aliases: z.array(z.string()),
  per_100g: amountsSchema.describe('Grams per 100 g edible portion; null when no source has a value'),
  amino_acid_score: z.object(overallScoreSchema),
  quality: z.object({
    origins: z.array(z.string()).describe('Independent origins of the values (laboratories or national databases)'),
    independent_sources: z.number().int(),
    max_spread: z.number().nullable().describe('Largest relative spread between origins over the amino acids'),
    estimated: z.array(z.string()).describe('Values that are estimated rather than measured'),
  }),
  sources: z.array(z.string()).describe('Source entries, as database:code'),
  dataset_url: z.string(),
  method_url: z.string(),
  licence: z.string(),
}

export const scoreFoodsInput = {
  items: z.array(z.object({
    id: z.string().max(100).describe('A food id from search_foods'),
    grams: z.number().positive().max(5000).describe('Grams of the food, more than 0 and at most 5000'),
  })).min(1).max(30).describe('The foods of a meal or a day, 1 to 30'),
}

const perAminoAcidSchema = z.object({
  mg_per_g_protein: z.number().nullable(),
  needed: z.number().describe('mg per g protein in the FAO (2013) pattern'),
  percent: z.number().nullable(),
  at_least: z.boolean(),
})

export const scoreFoodsOutput = {
  items: z.array(z.object({ id: z.string(), name: z.string(), grams: z.number() })),
  totals_g: amountsSchema.describe('Grams in the whole combination; null when no food has a value'),
  amino_acid_score: z.object({
    ...overallScoreSchema,
    per_amino_acid: z.object(
      Object.fromEntries(SCORING_PATTERN.map(item => [item.name, perAminoAcidSchema])) as Record<PatternName, typeof perAminoAcidSchema>,
    ),
  }),
  notes: z.array(z.string()),
  unknown_ids: z.array(z.string()),
}

// --- The tools -------------------------------------------------------------------------------

type Infer<T extends z.ZodRawShape> = z.infer<z.ZodObject<T>>

export function searchFoods(input: Infer<typeof searchFoodsInput>): ToolResult<Infer<typeof searchFoodsOutput>> {
  const query = input.query?.trim() ?? ''
  const limit = input.limit ?? 10
  const matches = matchFoods(query, input.category)
  const foods = matches.slice(0, limit).map(food => ({
    id: food.id,
    name: food.name,
    category: food.category,
    protein_g_per_100g: roundGrams(food.values.protein),
    independent_sources: food.quality.independentSources,
  }))

  const asked = [query && `"${query}"`, input.category && `in ${input.category}`].filter(Boolean).join(' ') || 'all foods'
  if (!foods.length) {
    const hint = input.category && !CATEGORIES.some(c => c.toLowerCase() === input.category!.trim().toLowerCase())
      ? ` Categories: ${CATEGORIES.join(', ')}.`
      : ' Try fewer or other words.'
    return ok(`No foods match ${asked}.${hint}`, { foods, total: 0 })
  }
  const lines = foods.map(f => `- ${f.id}: ${f.name} (${f.category}, ${f.protein_g_per_100g ?? '?'} g protein per 100 g)`)
  return ok(`${foods.length} of ${matches.length} foods for ${asked}:\n${lines.join('\n')}`, { foods, total: matches.length })
}

export function getFood(input: Infer<typeof getFoodInput>): ToolResult<Infer<typeof getFoodOutput>> {
  const food = findFood(input.id)
  if (!food) return failure(unknownIdText(input.id))

  // A food on its own, 100 g of it: a missing value makes that amino acid's score unknown.
  const totals = {} as Record<NutrientKey, { value: number | null, complete: boolean }>
  for (const key of Object.keys(AMOUNT_NAMES) as NutrientKey[]) {
    totals[key] = { value: food.values[key], complete: food.values[key] !== null }
  }
  const { overall } = aminoAcidScores(totals)
  const score = {
    percent: overall.percent === null ? null : Math.round(overall.percent),
    at_least: overall.atLeast,
    limiting: overall.limiting.map(key => SCORING_PATTERN.find(item => item.key === key)!.name),
  }

  const per100g = namedAmounts(food.values)
  const result = {
    id: food.id,
    name: food.name,
    category: food.category,
    aliases: food.aliases,
    per_100g: per100g,
    amino_acid_score: score,
    quality: {
      origins: food.quality.origins,
      independent_sources: food.quality.independentSources,
      max_spread: food.quality.maxSpread,
      estimated: food.quality.estimated,
    },
    sources: food.sources,
    dataset_url: DATASET_URL,
    method_url: METHOD_URL,
    licence: LICENCE,
  }
  const limiting = score.limiting.length ? `, limited by ${score.limiting.join(' and ')}` : ''
  const text = [
    `${food.name} (${food.id}, ${food.category}): ${per100g.protein ?? '?'} g protein per 100 g.`,
    `Amino acid score: ${describePercent(score.percent, score.at_least)}${limiting}.`,
    `Values from ${food.quality.independentSources} independent source(s). Aminoprofile dataset, ${LICENCE}, ${DATA_PAGE_URL}.`,
  ].join(' ')
  return ok(text, result)
}

export function scoreFoods(input: Infer<typeof scoreFoodsInput>): ToolResult<Infer<typeof scoreFoodsOutput>> {
  const known: { food: Food, grams: number }[] = []
  const unknownIds: string[] = []
  for (const item of input.items) {
    const food = findFood(item.id)
    if (food) known.push({ food, grams: item.grams })
    else if (!unknownIds.includes(item.id)) unknownIds.push(item.id)
  }
  if (!known.length) {
    return failure(`None of the ids are known. ${unknownIds.map(unknownIdText).join(' ')}`)
  }

  // Summed as the page's Total row is (stores/foods.ts): a food without a value adds nothing and
  // marks the sum incomplete, which makes a score built on it a lower bound.
  const totals = {} as Record<NutrientKey, { value: number | null, complete: boolean }>
  for (const key of Object.keys(AMOUNT_NAMES) as NutrientKey[]) {
    const values = known.map(({ food, grams }) => (food.values[key] === null ? null : (food.values[key]! * grams) / 100))
    const present = values.filter((v): v is number => v !== null)
    totals[key] = {
      value: present.length ? present.reduce((sum, v) => sum + v, 0) : null,
      complete: present.length === values.length,
    }
  }
  const scores = aminoAcidScores(totals)
  const perAminoAcid = {} as Record<PatternName, z.infer<typeof perAminoAcidSchema>>
  for (const item of SCORING_PATTERN) {
    const s = scores.byKey[item.key]
    perAminoAcid[item.name] = {
      mg_per_g_protein: s.mgPerG === null ? null : round(s.mgPerG, 1),
      needed: s.needed,
      percent: s.percent === null ? null : Math.round(s.percent),
      at_least: s.atLeast,
    }
  }
  const score = {
    percent: scores.overall.percent === null ? null : Math.round(scores.overall.percent),
    at_least: scores.overall.atLeast,
    limiting: scores.overall.limiting.map(key => SCORING_PATTERN.find(item => item.key === key)!.name),
    per_amino_acid: perAminoAcid,
  }

  const notes = [
    'Scored against the FAO (2013) amino acid scoring pattern for ages 3 and up (FAO Food and Nutrition Paper 92), with methionine counted together with cystine and phenylalanine together with tyrosine.',
    'Not corrected for digestibility, so this is an amino acid score and not a DIAAS: for most plant foods the DIAAS is lower.',
    `Values from the Aminoprofile dataset (${LICENCE}), ${DATA_PAGE_URL}.`,
  ]
  if (!scores.proteinKnown) notes.push('Not every food has a protein value, so there is no score.')
  else if (score.at_least) notes.push('A food lacks a value for a limiting amino acid, so the real score is at least the one given.')
  if (unknownIds.length) notes.push(`Left out, unknown ids: ${unknownIds.join(', ')}. Use search_foods to find an id.`)

  const totalsG = namedAmounts(Object.fromEntries(Object.entries(totals).map(([k, t]) => [k, t.value])) as Record<NutrientKey, number | null>)
  const items = known.map(({ food, grams }) => ({ id: food.id, name: food.name, grams }))
  const limiting = score.limiting.length ? `, limited by ${score.limiting.join(' and ')}` : ''
  const text = [
    `${items.map(i => `${i.grams} g ${i.name}`).join(' + ')}: ${totalsG.protein ?? '?'} g protein.`,
    `Amino acid score: ${describePercent(score.percent, score.at_least)}${limiting} (FAO 2013 pattern, ages 3+, not a DIAAS).`,
    unknownIds.length ? `Unknown ids left out: ${unknownIds.join(', ')}.` : '',
  ].filter(Boolean).join(' ')
  return ok(text, { items, totals_g: totalsG, amino_acid_score: score, notes, unknown_ids: unknownIds })
}
