// USDA FoodData Central, SR Legacy (April 2018, the final release), from the CSV download.
// Public domain (CC0). Amino acids are measured when the value's derivation belongs to an
// analytical source code (1, 6, 12 or 13 in food_nutrient_source.csv), and an estimate otherwise.

import { openZip } from '../lib/zip.mjs'
import { parseCsv } from '../lib/csv.mjs'
import { AA_KEYS } from './common.mjs'

const NUTRIENT_KEY = {
  1221: 'his', 1212: 'ile', 1213: 'leu', 1214: 'lys', 1215: 'met', 1216: 'cys',
  1217: 'phe', 1218: 'tyr', 1211: 'thr', 1210: 'trp', 1219: 'val',
  1002: 'nitrogen', 1003: 'protein', 1051: 'water', 1004: 'fat',
}
/** food_nutrient_source ids whose values are analytical: codes 1, 6, 12 and 13. */
const ANALYTICAL_SOURCES = new Set(['1', '4', '9', '10'])

export function loadUsda(zipPath) {
  const zip = openZip(zipPath)
  const dir = zip.names().find(n => n.endsWith('/food.csv')).replace(/food\.csv$/, '')
  const csv = name => parseCsv(zip.read(dir + name).toString('utf8'))

  const categories = new Map(csv('food_category.csv').map(c => [c.id, c.description]))
  const ndb = new Map(csv('sr_legacy_food.csv').map(r => [r.fdc_id, r.NDB_number]))
  const derivation = new Map(csv('food_nutrient_derivation.csv').map(d => [d.id, d]))
  const factorFood = new Map(csv('food_nutrient_conversion_factor.csv').map(r => [r.id, r.fdc_id]))
  const proteinFactor = new Map(csv('food_protein_conversion_factor.csv')
    .map(r => [factorFood.get(r.food_nutrient_conversion_factor_id), Number(r.value)]))

  const foods = new Map()
  for (const f of csv('food.csv')) {
    foods.set(f.fdc_id, {
      source: 'usda', id: f.fdc_id, ndb: ndb.get(f.fdc_id) ?? null, name: f.description, nameLocal: null,
      group: categories.get(f.food_category_id) ?? null,
      water: null, fat: null, protein: null, nitrogen: null, nitrogenFrom: null,
      aa: Object.fromEntries(AA_KEYS.map(k => [k, null])),
    })
  }
  for (const v of csv('food_nutrient.csv')) {
    const key = NUTRIENT_KEY[v.nutrient_id]
    const food = key && foods.get(v.fdc_id)
    if (!food || v.amount === '') continue
    const amount = Number(v.amount)
    if (!AA_KEYS.includes(key)) { food[key] = amount; continue }
    const d = derivation.get(v.derivation_id)
    food.aa[key] = {
      g: amount,
      estimate: !ANALYTICAL_SOURCES.has(d?.source_id),
      origin: 'usda',
      note: `${d?.code ?? '?'}${v.data_points ? `, n=${v.data_points}` : ''}`,
    }
  }
  const entries = []
  for (const food of foods.values()) {
    if (!AA_KEYS.some(k => food.aa[k])) continue
    if (food.nitrogen !== null) food.nitrogenFrom = 'reported'
    else if (food.protein !== null) {
      const factor = proteinFactor.get(food.id) ?? 6.25
      food.nitrogen = food.protein / factor
      food.nitrogenFrom = `protein / ${factor}`
    }
    entries.push(food)
  }
  return entries
}
