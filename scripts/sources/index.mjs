// Loads all four sources from data/sources/ (see scripts/fetch-sources.sh), cached in
// data/sources/.cache.json until a source file changes.

import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { loadUsda } from './usda.mjs'
import { loadBls } from './bls.mjs'
import { loadFrida } from './frida.mjs'
import { loadMext } from './mext.mjs'

const ROOT = fileURLToPath(new URL('../../data/sources/', import.meta.url))

export const SOURCE_FILES = {
  usda: ['usda/sr_legacy_csv.zip'],
  bls: ['bls/BLS_4_0_2025_DE/BLS_4_0_Daten_2025_DE.xlsx'],
  frida: ['frida/Frida_5.5_Dataset.xlsx'],
  mext: ['mext/table_1.xlsx', 'mext/table_05.xlsx'],
}

/** SHA-256 of each source file, so a build records exactly which releases it used. */
export function sourceHashes() {
  return Object.fromEntries(Object.values(SOURCE_FILES).flat().map(f =>
    [f, createHash('sha256').update(readFileSync(ROOT + f)).digest('hex')]))
}

export function loadAll() {
  const files = Object.values(SOURCE_FILES).flat()
  const missing = files.filter(f => !existsSync(ROOT + f))
  if (missing.length) throw new Error(`Missing source files in data/sources/: ${missing.join(', ')}`)
  const stamp = files.map(f => `${f}:${statSync(ROOT + f).size}:${statSync(ROOT + f).mtimeMs}`).join('|') + '|v1'
  const cachePath = `${ROOT}.cache.json`
  if (existsSync(cachePath)) {
    const cache = JSON.parse(readFileSync(cachePath, 'utf8'))
    if (cache.stamp === stamp) return cache.sources
  }
  const sources = {
    usda: loadUsda(ROOT + SOURCE_FILES.usda[0]),
    bls: loadBls(ROOT + SOURCE_FILES.bls[0]),
    frida: loadFrida(ROOT + SOURCE_FILES.frida[0]),
    mext: loadMext(ROOT + SOURCE_FILES.mext[0], ROOT + SOURCE_FILES.mext[1]),
  }
  writeFileSync(cachePath, JSON.stringify({ stamp, sources }))
  return sources
}
