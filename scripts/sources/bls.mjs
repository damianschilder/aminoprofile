// Bundeslebensmittelschlüssel (BLS) 4.0, Max Rubner-Institut, December 2025. CC BY 4.0.
// One row per food, three columns per nutrient: value (g/100 g), Datenherkunft (origin category)
// and Referenz. Nitrogen is the NT column where it is filled, otherwise protein / 6.25, since
// BLS defines protein as N x 6.25 (PROT625). Cystine is the CYSTE column.
//
// A value is measured when its origin is an analysis, the literature, an aggregation of the
// literature, or another nutrient database. Which database or study it came from is read from
// the reference text: BLS takes many amino acids from Souci-Fachmann-Kraut and some from USDA.
// Copied from a similar BLS food, a pattern scaled to protein, a recipe, rescaled for water,
// a label or an assumption counts as an estimate.

import { openXlsx } from '../lib/xlsx.mjs'
import { AA_KEYS, originFromReference, toNumber } from './common.mjs'

const CODES = { his: 'HIS', ile: 'ILE', leu: 'LEU', lys: 'LYS', met: 'MET', cys: 'CYSTE', phe: 'PHE', tyr: 'TYR', thr: 'THR', trp: 'TRP', val: 'VAL' }
const MEASURED = new Set(['Analyse', 'Literatur', 'Aggregation', 'Nährstoffdatenbank'])

export function loadBls(xlsxPath) {
  const book = openXlsx(xlsxPath)
  const [head, ...rows] = book.rows(book.sheetNames()[0])
  const col = code => head.findIndex(h => String(h ?? '').startsWith(`${code} `) && /\[/.test(String(h)))
  const cols = Object.fromEntries([...AA_KEYS.map(k => [k, col(CODES[k])]), ['water', col('WATER')], ['protein', col('PROT625')], ['fat', col('FAT')], ['nitrogen', col('NT')]])
  for (const [k, c] of Object.entries(cols)) if (c < 0) throw new Error(`BLS: no column for ${k}`)

  const entries = []
  for (const r of rows) {
    if (!r[0]) continue
    const aa = {}
    for (const k of AA_KEYS) {
      const g = toNumber(r[cols[k]])
      if (g === null) { aa[k] = null; continue }
      const how = String(r[cols[k] + 1] ?? '').trim()
      const reference = String(r[cols[k] + 2] ?? '').trim()
      const measured = MEASURED.has(how)
      aa[k] = {
        g,
        estimate: !measured,
        origin: measured ? (how === 'Analyse' ? 'de-mri' : originFromReference(reference) ?? 'de-literature') : 'bls',
        note: `${how}${reference ? `: ${reference.slice(0, 80)}` : ''}`,
      }
    }
    if (!AA_KEYS.some(k => aa[k])) continue
    const protein = toNumber(r[cols.protein])
    const nt = toNumber(r[cols.nitrogen])
    entries.push({
      source: 'bls', id: String(r[0]), name: String(r[2] ?? r[1]), nameLocal: String(r[1] ?? ''),
      group: String(r[0]).charAt(0),
      water: toNumber(r[cols.water]), fat: toNumber(r[cols.fat]), protein,
      nitrogen: nt ?? (protein === null ? null : protein / 6.25),
      nitrogenFrom: nt !== null ? 'reported' : protein === null ? null : 'protein / 6.25',
      aa,
    })
  }
  return entries
}
