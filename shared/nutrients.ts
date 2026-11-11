// The nutrients Aminoprofile shows: the nine essential amino acids and protein, in the column
// order of the table. All are in grams per 100 g of food, as in Aminoprofile's dataset
// (shared/food-index.json, built by scripts/build-foods.mjs).

export const NUTRIENTS = [
  { key: 'his', label: 'His', name: 'Histidine' },
  { key: 'ile', label: 'Ile', name: 'Isoleucine' },
  { key: 'leu', label: 'Leu', name: 'Leucine' },
  { key: 'lys', label: 'Lys', name: 'Lysine' },
  { key: 'met', label: 'Met', name: 'Methionine' },
  { key: 'phe', label: 'Phe', name: 'Phenylalanine' },
  { key: 'thr', label: 'Thr', name: 'Threonine' },
  { key: 'trp', label: 'Trp', name: 'Tryptophan' },
  { key: 'val', label: 'Val', name: 'Valine' },
  { key: 'protein', label: 'Protein', name: 'Protein' },
] as const

// Not columns of the table: the amino acid score counts cystine together with methionine and
// tyrosine together with phenylalanine, as the FAO scoring pattern does (shared/scoring.ts).
export const PARTNER_NUTRIENTS = [
  { key: 'cys', label: 'Cys', name: 'Cystine' },
  { key: 'tyr', label: 'Tyr', name: 'Tyrosine' },
] as const

/** Every value a food has: the table's columns and the partners. */
export const ALL_NUTRIENTS = [...NUTRIENTS, ...PARTNER_NUTRIENTS] as const

/** A column of the table. */
export type ColumnKey = typeof NUTRIENTS[number]['key']
export type NutrientKey = typeof ALL_NUTRIENTS[number]['key']

export const AMINO_ACID_KEYS = NUTRIENTS
  .filter(n => n.key !== 'protein')
  .map(n => n.key) as Exclude<ColumnKey, 'protein'>[]

/** Grams per 100 g; null when no source has a value (which is not the same as 0). */
export type NutrientValues = Record<NutrientKey, number | null>

/** A food of the dataset as the home page searches and adds it (shared/food-index.json). */
export interface IndexFood {
  id: string
  name: string
  category: string
  aliases: string[]
  values: NutrientValues
  /** How many independent laboratories or databases measured every essential amino acid. */
  independentSources: number
}

/** The shortest search that is run: one letter would match half the foods. */
export const QUERY_MIN_LENGTH = 2

/** Grams with two decimals, as the table shows them, or a dash when there is no value. */
export function formatGrams(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—'
  return (Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2)
}
