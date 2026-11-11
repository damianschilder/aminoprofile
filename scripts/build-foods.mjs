// Builds the Aminoprofile food dataset from the curated list (data/foods.csv), the links to the
// source databases (data/links.csv) and the sources themselves (data/sources/, see
// scripts/fetch-sources.sh). Writes:
//   public/data/aminoprofile-foods.json  the full dataset: values, per amino acid where they come
//                                 from and how far the sources agree, the links, the source
//                                 releases (served at https://aminoprofile.com/data/)
//   public/data/aminoprofile-foods.csv   the values and a quality summary, for spreadsheets
//   data/foods-report.md          checks for a person to review
//   shared/foods.json             what the site and the agent endpoint load
//   shared/richest-foods.json     per amino acid the foods richest in it, for the comparison table
//   shared/food-index.json        the slim list the home page searches in the browser
//
// The method (data/README.md has the full text and the references):
// 1. Only links that are exact or close and not rejected are used.
// 2. Nitrogen: per source the median of its linked entries, converted to dry matter, then the
//    median over sources, back at the median water content of the linked entries (FAO/INFOODS
//    food matching: compare water, adjust when it differs).
// 3. Amino acids are compared per gram of nitrogen, which takes away differences in water and in
//    each source's nitrogen-to-protein factor (Greenfield & Southgate: the reference level for
//    amino acids is mg per g nitrogen).
// 4. Per amino acid, the measured values are grouped by origin (the lab or database that measured
//    them), one median per origin, then the median over origins. A value a source copied from
//    USDA counts as USDA, so one measurement never counts twice, and when the food's own USDA
//    entry marks that value as an estimate, the copy is an estimate too. When nobody measured it,
//    the median of the sources' estimates is used and marked as estimated.
// 5. Grams per 100 g = profile x nitrogen. Protein = nitrogen x 6.25, the EU labelling definition.

import { readFileSync, writeFileSync } from 'node:fs'
import { parseCsv } from './lib/csv.mjs'
import { AA_KEYS } from './sources/common.mjs'
import { loadAll, sourceHashes } from './sources/index.mjs'
// The site's own FAO pattern, so the build and the page cannot disagree (Node strips its types).
import { SCORING_PATTERN } from '../shared/scoring.ts'

export const DATASET_VERSION = '0.3.0'
const root = new URL('../', import.meta.url)
const read = path => readFileSync(new URL(path, root), 'utf8')
const write = (path, text) => writeFileSync(new URL(path, root), text)

const SOURCES = {
  usda: { title: 'USDA FoodData Central, SR Legacy', release: 'April 2018', licence: 'CC0 1.0 (public domain)', url: 'https://fdc.nal.usda.gov/', credit: 'U.S. Department of Agriculture, Agricultural Research Service. FoodData Central: SR Legacy, 2018.' },
  bls: { title: 'Bundeslebensmittelschlüssel (BLS)', release: '4.0, December 2025', licence: 'CC BY 4.0', url: 'https://blsdb.de/', credit: 'Max Rubner-Institut (2025): Bundeslebensmittelschlüssel (BLS), Version 4.0. Karlsruhe. DOI: 10.25826/Data20251217-134202-0' },
  frida: { title: 'Frida, the Danish Food Composition Database', release: '5.5, November 2025', licence: 'CC BY 4.0', url: 'https://doi.org/10.11583/DTU.29500682', credit: 'Langwagen M, Jakobsen J, Christensen T, Poulsen A: The Danish Food Composition Database, Frida version 5.5, November 2025, National Food Institute, Technical University of Denmark.' },
  mext: { title: 'Standard Tables of Food Composition in Japan 2020 (8th edition), Amino Acids, enlarged 2023', release: 'revision of 27 March 2026', licence: 'Government of Japan Standard Terms of Use 2.0 (compatible with CC BY 4.0)', url: 'https://www.mext.go.jp/a_menu/syokuhinseibun/mext_00001.html', credit: 'Source: Ministry of Education, Culture, Sports, Science and Technology (MEXT), Japan. Processed by Aminoprofile.' },
}
const ORIGIN_NAMES = {
  usda: 'USDA', jp: 'Japan (MEXT)', dk: 'Denmark (DTU)', 'de-mri': 'Germany (Max Rubner-Institut)',
  souci: 'Souci-Fachmann-Kraut', mccance: 'McCance and Widdowson', 'de-literature': 'German literature (via BLS)', fi: 'Finland (Fineli)',
}
/** The essential amino acids, for the plausibility check. */
const EAA = ['his', 'ile', 'leu', 'lys', 'met', 'phe', 'thr', 'trp', 'val']
const EAA_PER_G_N = [1.6, 3.6]
const SPREAD_FLAG = 0.25
const DRY_MATTER_FLAG = 0.10
/**
 * An origin further than this from the median of all origins is an outlier (needs 3+). The median
 * of all, not of the others: with three origins the median of the other two is their mean, which
 * a wild value pulls along, so two of three were "outliers" and none was left out.
 */
const OUTLIER = 0.40
/**
 * An entry with the same value for this many amino acids has a data error. Seen in USDA SR
 * dairy entries (histidine, methionine and tryptophan all 0.547 g in a cheddar). Only checked
 * for USDA and BLS values with at least 3 significant digits: MEXT rounds to 2 digits and Frida's
 * older values to 10 mg per g nitrogen, so equal values are normal there.
 */
const REPEATED_VALUES = 3
const significantDigits = g => String(g).replace(/^[0.]+/, '').replace('.', '').replace(/0+$/, '').length

/** Amino acids of an entry that share one value with at least REPEATED_VALUES - 1 others. */
function repeatedValues(entry) {
  if (entry.source !== 'usda' && entry.source !== 'bls') return []
  const precise = AA_KEYS.filter(k => entry.aa[k] && significantDigits(entry.aa[k].g) >= 3)
  const byValue = groupBy(precise, k => entry.aa[k].g)
  return [...byValue.values()].filter(ks => ks.length >= REPEATED_VALUES).flat()
}

const median = xs => {
  const s = xs.filter(x => Number.isFinite(x)).sort((a, b) => a - b)
  if (!s.length) return null
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const round = (x, d) => (x === null ? null : Number(x.toFixed(d)))
const groupBy = (xs, key) => xs.reduce((m, x) => m.set(key(x), [...(m.get(key(x)) ?? []), x]), new Map())

const foods = parseCsv(read('data/foods.csv'))
const links = parseCsv(read('data/links.csv'))
const sources = loadAll()
const index = Object.fromEntries(Object.entries(sources).map(([name, entries]) => [name, new Map(entries.map(e => [String(e.id), e]))]))

const problems = []
for (const l of links) {
  if (!foods.some(f => f.id === l.food_id)) problems.push(`links.csv: unknown food ${l.food_id}`)
  if (!index[l.source]?.has(l.source_id)) problems.push(`links.csv: ${l.source} has no entry ${l.source_id} (${l.food_id})`)
  if (!['exact', 'close', 'broad'].includes(l.relation)) problems.push(`links.csv: relation "${l.relation}" (${l.food_id})`)
  if (!['proposed', 'confirmed', 'rejected'].includes(l.status)) problems.push(`links.csv: status "${l.status}" (${l.food_id})`)
}
if (problems.length) { console.error(problems.join('\n')); process.exit(1) }

const built = foods.map((food) => {
  const used = links.filter(l => l.food_id === food.id && l.status !== 'rejected' && l.relation !== 'broad')
    .map(l => ({ link: l, entry: index[l.source].get(l.source_id) }))
  const flags = []

  // Water and nitrogen, one vote per source.
  const water = median([...groupBy(used, u => u.link.source).values()].map(g => median(g.map(u => u.entry.water))))
  const dryN = [...groupBy(used.filter(u => u.entry.nitrogen !== null), u => u.link.source).values()].map(g => median(g.map(u =>
    u.entry.water !== null && water !== null ? (u.entry.nitrogen / (100 - u.entry.water)) * 100 : null)))
  let nitrogen = water !== null && dryN.some(x => x !== null) ? (median(dryN) * (100 - water)) / 100 : median(used.map(u => u.entry.nitrogen))
  if (nitrogen === null) flags.push('no nitrogen value')
  if (water !== null) {
    const off = used.filter(u => u.entry.water !== null && Math.abs((100 - u.entry.water) - (100 - water)) / (100 - water) > DRY_MATTER_FLAG)
    if (off.length) flags.push(`dry matter differs more than 10% from the median for ${off.map(u => `${u.link.source} ${u.link.source_id} (water ${u.entry.water})`).join(', ')}; nitrogen adjusted to ${round(water, 1)} g water`)
  }

  // Entries with a data error give no amino acids (they still count for water and nitrogen).
  const broken = new Set()
  for (const u of used) {
    const same = repeatedValues(u.entry)
    if (same.length) {
      broken.add(u)
      flags.push(`${u.link.source} ${u.link.source_id} left out: the same value for ${same.join(', ')}, a data error`)
    }
  }

  // A value BLS or Frida copied from USDA is only as good as USDA's own: when the food's linked
  // USDA entries estimated it, the copy is an estimate too, not a second measurement.
  const ownUsda = used.filter(u => u.link.source === 'usda')
  const copiesUsdaEstimate = (u, k) => {
    if (u.link.source === 'usda' || u.entry.aa[k].origin !== 'usda') return false
    const own = ownUsda.filter(x => x.entry.aa[k])
    return own.length > 0 && own.every(x => x.entry.aa[k].estimate)
  }

  // Amino acids per gram of nitrogen.
  const perAminoAcid = {}
  const values = {}
  for (const k of AA_KEYS) {
    // A 0 is not a measurement: every protein contains every amino acid, so it is a data error
    // (seen in Danish fruit and vegetable entries and one USDA soy milk cystine).
    const zero = used.filter(u => !broken.has(u) && u.entry.aa[k]?.g === 0)
    if (zero.length) flags.push(`${k}: ${zero.map(u => `${u.link.source} ${u.link.source_id}`).join(', ')} left out, 0 is a data error`)
    const withN = used.filter(u => !broken.has(u) && u.entry.aa[k]?.g > 0 && u.entry.nitrogen > 0)
    const measured = withN.filter(u => !u.entry.aa[k].estimate && !copiesUsdaEstimate(u, k))
    const byOrigin = groupBy(measured, u => u.entry.aa[k].origin)
    let originProfiles = [...byOrigin].map(([origin, g]) => ({ origin, profile: median(g.map(u => u.entry.aa[k].g / u.entry.nitrogen)) }))
    // Outliers, marked for exclusion rather than deleted (Greenfield & Southgate): only with 3+
    // origins can one be told apart from the rest.
    const all = median(originProfiles.map(o => o.profile))
    const outliers = originProfiles.length >= 3
      ? originProfiles.filter(o => Math.abs(o.profile - all) / all > OUTLIER)
      : []
    if (outliers.length && outliers.length < originProfiles.length / 2) {
      flags.push(`${k}: ${outliers.map(o => `${o.origin} (${Math.round(o.profile * 1000)} mg/g N)`).join(', ')} left out as an outlier against ${originProfiles.filter(o => !outliers.includes(o)).map(o => `${o.origin} ${Math.round(o.profile * 1000)}`).join(', ')}`)
      originProfiles = originProfiles.filter(o => !outliers.includes(o))
    }
    let profile, basis
    if (originProfiles.length) {
      profile = median(originProfiles.map(o => o.profile))
      basis = 'measured'
    } else {
      const estimates = [...groupBy(withN, u => u.link.source).values()].map(g => median(g.map(u => u.entry.aa[k].g / u.entry.nitrogen)))
      profile = median(estimates)
      basis = profile === null ? 'missing' : 'estimated'
    }
    const ps = originProfiles.map(o => o.profile)
    const spread = ps.length >= 2 ? (Math.max(...ps) - Math.min(...ps)) / profile : null
    perAminoAcid[k] = {
      basis,
      origins: originProfiles.map(o => o.origin).sort(),
      mgPerGramNitrogen: round(profile === null ? null : profile * 1000, 0),
      byOrigin: Object.fromEntries(originProfiles.map(o => [o.origin, round(o.profile * 1000, 0)])),
      outliers: Object.fromEntries(outliers.filter(o => !originProfiles.includes(o)).map(o => [o.origin, round(o.profile * 1000, 0)])),
      spread: round(spread, 3),
    }
    values[k] = profile === null || nitrogen === null ? null : round(profile * nitrogen, 4)
    if (basis === 'missing') flags.push(`no ${k} value`)
    if (basis === 'estimated') flags.push(`${k} only estimated`)
    if (spread !== null && spread > SPREAD_FLAG) flags.push(`${k}: sources differ by ${Math.round(spread * 100)}% (${originProfiles.map(o => `${o.origin} ${Math.round(o.profile * 1000)}`).join(', ')} mg/g N)`)
  }
  values.protein = nitrogen === null ? null : round(nitrogen * 6.25, 2)

  const eaaPerN = EAA.every(k => perAminoAcid[k].mgPerGramNitrogen !== null)
    ? EAA.reduce((s, k) => s + perAminoAcid[k].mgPerGramNitrogen, 0) / 1000 : null
  if (eaaPerN !== null && (eaaPerN < EAA_PER_G_N[0] || eaaPerN > EAA_PER_G_N[1])) flags.push(`essential amino acids add up to ${eaaPerN.toFixed(2)} g per g nitrogen, outside ${EAA_PER_G_N.join('-')}`)

  const origins = [...new Set(EAA.flatMap(k => perAminoAcid[k].origins))].sort()
  const spreads = EAA.map(k => perAminoAcid[k].spread).filter(x => x !== null)
  return {
    id: food.id,
    name: food.name,
    category: food.category,
    aliases: food.aliases ? food.aliases.split('|') : [],
    values,
    water: round(water, 1),
    quality: {
      origins,
      independentSources: Math.min(...EAA.map(k => perAminoAcid[k].origins.length)),
      maxSpread: spreads.length ? round(Math.max(...spreads), 3) : null,
      estimated: AA_KEYS.filter(k => perAminoAcid[k].basis === 'estimated'),
      flags,
    },
    perAminoAcid,
    links: links.filter(l => l.food_id === food.id).map(l => {
      const e = index[l.source].get(l.source_id)
      return { source: l.source, id: l.source_id, name: e.name, relation: l.relation, status: l.status, reason: l.reason, water: e.water, nitrogen: round(e.nitrogen, 3) }
    }),
  }
})

const hashes = sourceHashes()
const dataset = {
  name: 'Aminoprofile foods',
  version: DATASET_VERSION,
  description: 'Essential amino acids, cystine, tyrosine and protein of everyday foods, combined from four national food composition databases, with where each value comes from and how far the sources agree.',
  licence: 'CC BY 4.0',
  units: 'Grams per 100 g edible portion. Protein = nitrogen x 6.25. mgPerGramNitrogen: milligrams of the amino acid per gram of nitrogen.',
  method: 'https://github.com/damianschilder/aminoprofile/blob/main/data/README.md',
  sources: Object.fromEntries(Object.entries(SOURCES).map(([k, s]) => [k, { ...s, files: Object.fromEntries(Object.entries(hashes).filter(([f]) => f.startsWith(`${k}/`))) }])),
  originNames: ORIGIN_NAMES,
  foods: built,
}
write('public/data/aminoprofile-foods.json', `${JSON.stringify(dataset, null, 2)}\n`)

// What the site and the agent endpoint need: no link reasons, no flags. byOrigin (mg per g
// nitrogen per origin, outliers left out) and the names of the source entries are for the food
// pages (pages/foods/[id].vue), which show how far the sources agree.
const usedLinks = f => f.links.filter(l => l.status !== 'rejected' && l.relation !== 'broad')
write('shared/foods.json', `${JSON.stringify({
  version: DATASET_VERSION,
  originNames: ORIGIN_NAMES,
  foods: built.map(f => ({
    id: f.id,
    name: f.name,
    category: f.category,
    aliases: f.aliases,
    values: f.values,
    quality: { origins: f.quality.origins, independentSources: f.quality.independentSources, maxSpread: f.quality.maxSpread, estimated: f.quality.estimated },
    sources: usedLinks(f).map(l => `${l.source}:${l.id}`),
    entries: usedLinks(f).map(l => ({ source: l.source, id: l.id, name: l.name, relation: l.relation })),
    byOrigin: Object.fromEntries(AA_KEYS.map(k => [k, f.perAminoAcid[k].byOrigin])),
  })),
})}\n`)

// For the comparison table (components/Ui/TableV2.vue): per amino acid of the FAO pattern, the
// foods with the most of it per gram of protein, one per food group, so a combination that falls
// short can be told what to add. Not vegetables or fruit: part of their nitrogen is not protein,
// so their per-gram-of-protein values are unreliable (data/README.md, known limits). Only foods
// someone eats for protein (at least 10 g per 100 g) whose values at least two independent
// sources measured: otherwise a sweetened condensed milk or a single lab's value tops the list
// by noise. Small on purpose: the table's page loads it, unlike shared/foods.json.
const LOW_PROTEIN_GROUPS = new Set(['Vegetables', 'Fruit'])
const SUGGEST_MIN_PROTEIN = 10
const richest = Object.fromEntries(SCORING_PATTERN.map((item) => {
  const ranked = built
    .filter(f => !LOW_PROTEIN_GROUPS.has(f.category) && f.values.protein >= SUGGEST_MIN_PROTEIN && f.quality.independentSources >= 2)
    .filter(f => f.values[item.key] !== null && (!item.partner || f.values[item.partner] !== null))
    .map(f => ({ id: f.id, name: f.name, category: f.category, mgPerG: ((f.values[item.key] + (item.partner ? f.values[item.partner] : 0)) * 1000) / f.values.protein }))
    .sort((a, b) => b.mgPerG - a.mgPerG)
  const seen = new Set()
  const picked = ranked.filter(f => !seen.has(f.category) && seen.add(f.category)).slice(0, 3)
  return [item.key, picked.map(f => ({ id: f.id, name: f.name, mgPerG: Math.round(f.mgPerG) }))]
}))
write('shared/richest-foods.json', `${JSON.stringify({ version: DATASET_VERSION, byKey: richest }, null, 1)}\n`)

// For the search on the home page (stores/foods.ts), which runs in the browser: what a result and
// a table row need, nothing more, so it stays small enough to ship with the page.
write('shared/food-index.json', `${JSON.stringify({
  version: DATASET_VERSION,
  foods: built.map(f => ({
    id: f.id,
    name: f.name,
    category: f.category,
    aliases: f.aliases,
    values: f.values,
    independentSources: f.quality.independentSources,
  })),
})}\n`)

const csvCell = v => (v === null || v === undefined ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))
const columns = ['id', 'name', 'category', 'protein', ...AA_KEYS, 'independent_sources', 'origins', 'max_spread', 'estimated']
write('public/data/aminoprofile-foods.csv', `${[columns.join(','), ...built.map(f => [
  f.id, f.name, f.category, f.values.protein, ...AA_KEYS.map(k => f.values[k]),
  f.quality.independentSources, f.quality.origins.join('|'), f.quality.maxSpread, f.quality.estimated.join('|'),
].map(csvCell).join(','))].join('\n')}\n`)

// The report for review.
const pct = x => (x === null ? '–' : `${Math.round(x * 100)}%`)
const lines = [
  `# Food dataset build report (version ${DATASET_VERSION})`, '',
  `${built.length} foods, ${links.length} links (${links.filter(l => l.status === 'confirmed').length} confirmed, ${links.filter(l => l.status === 'proposed').length} proposed, ${links.filter(l => l.status === 'rejected').length} rejected).`,
  `Foods with at least 2 independent measured sources for every essential amino acid: ${built.filter(f => f.quality.independentSources >= 2).length}. With only estimates for some amino acid: ${built.filter(f => f.quality.estimated.length).length}. With flags: ${built.filter(f => f.quality.flags.length).length}.`, '',
  '| Food | Protein g/100 g | Independent sources | Largest disagreement | Origins |', '|---|---|---|---|---|',
  ...built.map(f => `| ${f.name} | ${f.values.protein ?? '–'} | ${f.quality.independentSources} | ${pct(f.quality.maxSpread)} | ${f.quality.origins.join(', ')} |`), '',
  '## Flags', '',
  ...built.filter(f => f.quality.flags.length).flatMap(f => [`### ${f.name} (\`${f.id}\`)`, ...f.quality.flags.map(x => `- ${x}`), '']),
]
write('data/foods-report.md', `${lines.join('\n')}\n`)
console.log(lines.slice(0, 4).join('\n'))
