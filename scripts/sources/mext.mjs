// Standard Tables of Food Composition in Japan 2020 (8th revised edition), Amino Acids, updated
// and enlarged 2023, revised 27 March 2026. MEXT, Government of Japan Standard Terms of Use
// (compatible with CC BY 4.0). Food names are Japanese only.
//
// Table 1 gives mg per 100 g edible portion for every food. Values in parentheses are estimates
// (from similar foods or the US tables). Table 2 gives mg per g of reference nitrogen for the
// analysed foods only, so a food's nitrogen is its amount per 100 g divided by its amount per g
// nitrogen (the median over the amino acids, which agree to rounding).

import { openXlsx } from '../lib/xlsx.mjs'
import { AA_KEYS } from './common.mjs'

const CODES = { his: 'HIS', ile: 'ILE', leu: 'LEU', lys: 'LYS', met: 'MET', cys: 'CYS', phe: 'PHE', tyr: 'TYR', thr: 'THR', trp: 'TRP', val: 'VAL' }

/** { value, estimate } from a cell: 550, "(550)", "-", "Tr". */
function cell(raw) {
  if (typeof raw === 'number') return { value: raw, estimate: false }
  const s = String(raw ?? '').trim()
  const m = s.match(/^\((\d+(?:\.\d+)?)\)$/)
  if (m) return { value: Number(m[1]), estimate: true }
  if (/^\d+(\.\d+)?$/.test(s)) return { value: Number(s), estimate: false }
  return { value: null, estimate: false }
}

/**
 * Rows of the whole-table sheet, the column of each component code, and the food rows. Codes
 * carry trailing spaces ("ILE "), and table 2 adds an N for "per nitrogen" ("ILEN").
 */
function read(path) {
  const book = openXlsx(path)
  const rows = book.rows(book.sheetNames()[0])
  const code = c => String(c ?? '').trim()
  const codeRow = rows.find(r => r.some(c => code(c) === 'ILE' || code(c) === 'ILEN'))
  const col = name => codeRow.findIndex(c => code(c) === name || code(c) === `${name}N`)
  const foods = rows.filter(r => /^\d{5}$/.test(String(r[1] ?? '').trim()))
  return { col, foods }
}

const median = xs => { const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }

export function loadMext(table1Path, table2Path) {
  const t1 = read(table1Path)
  const t2 = read(table2Path)
  const perN = new Map(t2.foods.map(r => [String(r[1]).trim(), r]))
  const entries = []
  for (const r of t1.foods) {
    const id = String(r[1]).trim()
    const aa = {}
    for (const k of AA_KEYS) {
      const { value, estimate } = cell(r[t1.col(CODES[k])])
      aa[k] = value === null ? null : { g: value / 1000, estimate, origin: estimate ? 'mext' : 'jp', note: estimate ? 'estimate (in parentheses)' : 'analysed' }
    }
    if (!AA_KEYS.some(k => aa[k])) continue
    // Nitrogen from table 2, for the analysed foods.
    let nitrogen = null
    const n = perN.get(id)
    if (n) {
      const ratios = AA_KEYS.map(k => {
        const per100 = cell(r[t1.col(CODES[k])]).value
        const perG = cell(n[t2.col(CODES[k])]).value
        return per100 && perG ? per100 / perG : null
      }).filter(x => x !== null)
      if (ratios.length) nitrogen = median(ratios)
    }
    const water = cell(r[t1.col('WATER')]).value
    const protein = cell(r[t1.col('PROT-')]).value
    entries.push({
      source: 'mext', id, name: String(r[3] ?? '').trim(), nameLocal: String(r[3] ?? '').trim(),
      group: String(r[0] ?? '').trim(), remark: String(r[t1.col('AMMON-E') + 1] ?? '').trim(),
      water, fat: null, protein, nitrogen, nitrogenFrom: nitrogen === null ? null : 'table 2 (per g nitrogen)',
      aa,
    })
  }
  return entries
}
