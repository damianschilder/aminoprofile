// Frida 5.5, the Danish Food Composition Database, DTU National Food Institute, November 2025.
// CC BY 4.0 (https://doi.org/10.11583/DTU.29500682). Amino acids in mg/100 g, nitrogen in
// g/100 g, every value with its source references and, when it was borrowed from another Frida
// food, that food (SourceFood).
//
// A value is an estimate when it was borrowed from another Frida food or when all its sources
// are estimates (EuroFIR reference type E). Otherwise its origin is the database its reference
// names (USDA, McCance and Widdowson, Souci-Fachmann-Kraut), or Danish ('dk').

import { openXlsx } from '../lib/xlsx.mjs'
import { AA_KEYS, originFromReference, toNumber } from './common.mjs'

const PARAM = { 159: 'his', 161: 'ile', 180: 'leu', 183: 'lys', 189: 'met', 124: 'cys', 211: 'phe', 264: 'tyr', 258: 'thr', 262: 'trp', 266: 'val', 300: 'nitrogen', 218: 'protein', 268: 'water', 141: 'fat' }

function table(book, name) {
  const [head, ...rows] = book.rows(name)
  return rows.map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])))
}

export function loadFrida(xlsxPath) {
  const book = openXlsx(xlsxPath)
  const sources = new Map(table(book, 'Source').map(s => [String(s.SourceID), s]))
  const foods = new Map()
  for (const f of table(book, 'Food')) {
    foods.set(String(f.FoodID), {
      source: 'frida', id: String(f.FoodID), name: String(f.FoodName ?? ''), nameLocal: String(f['FødevareNavn'] ?? ''),
      group: f.FoodGroup ? String(f.FoodGroup) : null, foodEx2: f.FoodEx2Code ? String(f.FoodEx2Code) : null,
      water: null, fat: null, protein: null, nitrogen: null, nitrogenFrom: 'reported',
      aa: Object.fromEntries(AA_KEYS.map(k => [k, null])),
    })
  }
  for (const v of table(book, 'Data_Normalised')) {
    const key = PARAM[v.ParameterID]
    const food = key && foods.get(String(v.FoodID))
    const value = toNumber(v.ResVal)
    if (!food || value === null) continue
    if (!AA_KEYS.includes(key)) { food[key] = value; continue }
    const refs = String(v.Source ?? '').split(',').map(s => sources.get(s.trim())).filter(Boolean)
    const borrowed = v.SourceFood !== null && v.SourceFood !== 'NULL' && v.SourceFood !== ''
    const allEstimates = refs.length > 0 && refs.every(s => s.EurofirRefType === 'E')
    const named = refs.map(s => originFromReference(`${s.TitleOriginal} ${s.TitleEnglish} ${s.Publisher}`)).find(Boolean)
    food.aa[key] = {
      g: value / 1000,
      estimate: borrowed || allEstimates,
      origin: borrowed || allEstimates ? 'frida' : named ?? 'dk',
      note: borrowed ? `borrowed from Frida food ${v.SourceFood}` : refs.map(s => `${s.SourceID} ${s.Year ?? ''}`.trim()).join(', '),
    }
  }
  return [...foods.values()].filter(f => AA_KEYS.some(k => f.aa[k]))
}
