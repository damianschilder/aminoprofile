// Suggests, for every food in data/foods.csv, the entries in each source that could match it, so
// a person can choose the links in data/links.csv. It only proposes: nothing is linked
// automatically (FAO/INFOODS food matching asks for a documented, deliberate match).
//
// Ranking: the hint words found in the entry's name (English for USDA, BLS and Frida, Japanese
// for MEXT), fewer extra words, and measured amino acids before estimated ones. Each line shows
// what matters for the match: water, nitrogen x 6.25, and where its lysine value comes from.
//
// Usage: node scripts/find-candidates.mjs [food-id ...] > data/candidates.txt

import { readFileSync } from 'node:fs'
import { parseCsv } from './lib/csv.mjs'
import { loadAll } from './sources/index.mjs'

const PER_SOURCE = 5
const foods = parseCsv(readFileSync(new URL('../data/foods.csv', import.meta.url), 'utf8'))
const only = new Set(process.argv.slice(2))
const sources = loadAll()

const words = s => String(s ?? '').toLowerCase().normalize('NFKC').split(/[^\p{L}\p{N}%.-]+/u).filter(Boolean)
  .map(w => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w))
const jaTokens = s => String(s ?? '').normalize('NFKC').split(/\s+/).filter(Boolean)

function score(entry, food) {
  if (entry.source === 'mext') {
    const name = entry.name.normalize('NFKC')
    const tokens = jaTokens(food.hint_ja)
    if (!tokens.length) return -1
    const hits = tokens.filter(t => name.includes(t)).length
    return hits === tokens.length ? 10 - name.length / 20 : hits / tokens.length
  }
  const want = words(food.hint_en)
  const have = words(entry.name)
  const hits = want.filter(w => have.some(h => h.startsWith(w))).length
  if (!hits) return -1
  return (hits === want.length ? 10 : (5 * hits) / want.length) - Math.max(0, have.length - want.length) * 0.15
}

const fmt = x => (x === null || x === undefined ? '  -  ' : x.toFixed(1).padStart(5))
for (const food of foods) {
  if (only.size && !only.has(food.id)) continue
  console.log(`\n### ${food.id}: ${food.name}   [en: ${food.hint_en}] [ja: ${food.hint_ja}]`)
  for (const [name, entries] of Object.entries(sources)) {
    const ranked = entries
      .map(e => ({ e, s: score(e, food) + (e.aa.lys && !e.aa.lys.estimate ? 0.5 : 0) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, PER_SOURCE)
    if (!ranked.length) { console.log(`  ${name}: none`); continue }
    for (const { e } of ranked) {
      const lys = e.aa.lys ? `${e.aa.lys.estimate ? 'est' : 'meas'}:${e.aa.lys.origin}` : 'no lys'
      console.log(`  ${name.padEnd(5)} ${String(e.id).padEnd(8)} water${fmt(e.water)} prot${fmt(e.nitrogen === null ? null : e.nitrogen * 6.25)}  ${lys.padEnd(16)} ${e.name}`)
    }
  }
}
