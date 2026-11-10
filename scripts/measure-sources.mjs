// Prints, per source: how many foods have amino acid values, how many of those values the source
// measured itself, where the measured ones come from, and how many foods have a nitrogen value.
// Usage: node scripts/measure-sources.mjs

import { loadAll } from './sources/index.mjs'
import { AA_KEYS } from './sources/common.mjs'

const sources = loadAll()
for (const [name, entries] of Object.entries(sources)) {
  const withLys = entries.filter(e => e.aa.lys)
  const measured = withLys.filter(e => !e.aa.lys.estimate)
  const origins = new Map()
  for (const e of measured) origins.set(e.aa.lys.origin, (origins.get(e.aa.lys.origin) ?? 0) + 1)
  const complete = entries.filter(e => AA_KEYS.every(k => e.aa[k]))
  const withN = entries.filter(e => e.nitrogen !== null)
  console.log(`\n${name}: ${entries.length} foods with amino acid values, ${complete.length} with all 11 used here`)
  console.log(`  lysine: ${withLys.length} foods, measured for ${measured.length} (${Math.round(100 * measured.length / withLys.length)}%)`)
  console.log(`  measured lysine by origin: ${[...origins].sort((a, b) => b[1] - a[1]).map(([o, n]) => `${o} ${n}`).join(', ')}`)
  console.log(`  nitrogen known: ${withN.length}`)
}
