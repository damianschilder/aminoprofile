// What every source loader returns, so the build can treat USDA, BLS, MEXT and Frida alike.
//
// An entry is one food of one source:
//   { source, id, name, nameLocal, group, water, fat, protein, nitrogen, nitrogenFrom, aa }
// - water, fat, protein, nitrogen: g per 100 g edible portion, or null. `protein` is the source's
//   own figure (each source uses its own nitrogen factor), so the build works from `nitrogen`.
// - aa: for each key in AA_KEYS either null or { g, estimate, origin, note }:
//     g         grams per 100 g
//     estimate  true when the source did not measure it for this food (borrowed from a similar
//               food, calculated, imputed, a recipe, or scaled from another form)
//     origin    who measured it: the source itself, or the database it was taken from ('usda',
//               'souci', 'mccance', ...). Two values with the same origin are not independent.
//     note      the source's own code or reference, for the report

export const AA_KEYS = ['his', 'ile', 'leu', 'lys', 'met', 'cys', 'phe', 'tyr', 'thr', 'trp', 'val']

/** The original database a reference text points at, or null when it names none we know. */
export function originFromReference(text) {
  const t = String(text ?? '')
  if (/USDA|US Department of Agriculture|Agricultural Research Service|Standard Reference/i.test(t)) return 'usda'
  if (/Souci|Kirchhoff|Fachmann|Kraut/i.test(t)) return 'souci'
  if (/McCance|Widdowson/i.test(t)) return 'mccance'
  if (/Frida|Danish food|DTU|F(ø|oe)devare/i.test(t)) return 'dk'
  if (/Fineli/i.test(t)) return 'fi'
  if (/Standard Tables of Food Composition in Japan|日本食品標準成分表/i.test(t)) return 'jp'
  return null
}

/** A number from a cell, or null for empty, "-", "Tr", "<LOQ" and the like. */
export function toNumber(raw) {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  if (raw === null || raw === undefined) return null
  const s = String(raw).trim().replace(',', '.')
  if (!/^-?\d+(\.\d+)?(e-?\d+)?$/i.test(s)) return null
  return Number(s)
}
