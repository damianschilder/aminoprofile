// The amino acid score of the ticked foods together. For each essential amino acid: how many
// milligrams there are per gram of protein, as a share of what the FAO scoring pattern asks. The
// lowest share is the score of the whole combination, and its amino acid is the limiting one.
//
// The pattern counts methionine together with cystine and phenylalanine together with tyrosine
// (the body makes cystine from methionine and tyrosine from phenylalanine), so those two scores
// include their partner.
//
// This is an amino acid score, not a DIAAS: it is not corrected for how well each food is
// digested, which lowers the score of most plant foods.
//
// Pattern: FAO (2013), Dietary protein quality evaluation in human nutrition, FAO Food and
// Nutrition Paper 92, the scoring pattern for older children, adolescents and adults, in mg per
// g protein.
//
// Imports only types, so this file runs as it is under Node for a quick check.

import type { NutrientKey } from './nutrients'

export const SCORING_PATTERN = [
  { key: 'his', name: 'histidine', mgPerG: 16 },
  { key: 'ile', name: 'isoleucine', mgPerG: 30 },
  { key: 'leu', name: 'leucine', mgPerG: 61 },
  { key: 'lys', name: 'lysine', mgPerG: 48 },
  { key: 'met', partner: 'cys', name: 'methionine + cystine', mgPerG: 23 },
  { key: 'phe', partner: 'tyr', name: 'phenylalanine + tyrosine', mgPerG: 41 },
  { key: 'thr', name: 'threonine', mgPerG: 25 },
  { key: 'trp', name: 'tryptophan', mgPerG: 6.6 },
  { key: 'val', name: 'valine', mgPerG: 40 },
] as const satisfies ReadonlyArray<{ key: NutrientKey, partner?: NutrientKey, name: string, mgPerG: number }>

export type ScoredKey = typeof SCORING_PATTERN[number]['key']

/** A sum over the ticked foods, as the store's Total row has it. */
interface Sum {
  /** Grams; null when no ticked food has a value. */
  value: number | null
  /** False when at least one ticked food has no value. */
  complete: boolean
}

export interface AminoAcidScore {
  /** Percent of the pattern; null when there is no protein total or no value at all. */
  percent: number | null
  /** Milligrams of the amino acid (with its partner) per gram of protein. */
  mgPerG: number | null
  /** What the pattern asks, in mg per g protein. */
  needed: number
  /** A ticked food has no value for it (or its partner), so the real score is at least this. */
  atLeast: boolean
}

export interface Scores {
  byKey: Record<ScoredKey, AminoAcidScore>
  /** False when not every ticked food has a protein value: then there is no score at all. */
  proteinKnown: boolean
  /** The lowest percent, and the amino acids that have it; null when one has no score. */
  overall: { percent: number | null, atLeast: boolean, limiting: ScoredKey[] }
}

export function aminoAcidScores(totals: Record<NutrientKey, Sum>): Scores {
  const protein = totals.protein
  const proteinKnown = protein.value !== null && protein.complete && protein.value > 0
  const byKey = {} as Record<ScoredKey, AminoAcidScore>
  for (const item of SCORING_PATTERN) {
    const own = totals[item.key]
    const partner = 'partner' in item ? totals[item.partner] : null
    if (!proteinKnown || own.value === null) {
      byKey[item.key] = { percent: null, mgPerG: null, needed: item.mgPerG, atLeast: false }
      continue
    }
    const grams = own.value + (partner?.value ?? 0)
    const mgPerG = (grams * 1000) / protein.value!
    byKey[item.key] = {
      percent: (mgPerG / item.mgPerG) * 100,
      mgPerG,
      needed: item.mgPerG,
      atLeast: !own.complete || (partner !== null && (partner.value === null || !partner.complete)),
    }
  }

  const scored = SCORING_PATTERN.map(item => ({ key: item.key, score: byKey[item.key] }))
  if (scored.some(s => s.score.percent === null)) {
    return { byKey, proteinKnown, overall: { percent: null, atLeast: false, limiting: [] } }
  }
  const lowest = Math.min(...scored.map(s => s.score.percent!))
  const limiting = scored.filter(s => s.score.percent === lowest)
  // Only the lowest scores can make the overall score a lower bound: a higher score that is
  // itself a lower bound can only be higher still.
  return {
    byKey,
    proteinKnown,
    overall: { percent: lowest, atLeast: limiting.some(s => s.score.atLeast), limiting: limiting.map(s => s.key) },
  }
}

/** "87%", or "≥ 87%" for a lower bound. */
export function formatPercent(percent: number, atLeast = false): string {
  return `${atLeast ? '≥ ' : ''}${Math.round(percent)}%`
}
