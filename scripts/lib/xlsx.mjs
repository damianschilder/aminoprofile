// Reads the sheets of an .xlsx file as rows of cell values, without any dependency. Handles shared
// strings, inline strings and formula results (cached values). Cell styles, dates and merged cells
// are not interpreted: the source tables only need text and numbers.

import { openZip } from './zip.mjs'

const ENTITIES = { lt: '<', gt: '>', quot: '"', apos: "'", amp: '&' }
const decode = s => s.replace(/&(lt|gt|quot|apos|amp|#(\d+)|#x([0-9a-f]+));/gi, (_, name, dec, hex) =>
  dec ? String.fromCodePoint(Number(dec)) : hex ? String.fromCodePoint(parseInt(hex, 16)) : ENTITIES[name])
const textOf = xml => decode([...xml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(t => t[1]).join(''))

/** Column letters to a zero-based index: A = 0, Z = 25, AA = 26. */
export function columnIndex(letters) {
  let n = 0
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

export function openXlsx(path) {
  const zip = openZip(path)
  const read = name => zip.read(name)?.toString('utf8') ?? ''
  const shared = [...read('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => textOf(m[1]))
  const workbook = read('xl/workbook.xml')
  const rels = read('xl/_rels/workbook.xml.rels')
  const sheets = [...workbook.matchAll(/<sheet\b[^>]*>/g)].map(m => {
    const name = decode(m[0].match(/name="([^"]*)"/)[1])
    const rid = m[0].match(/r:id="([^"]*)"/)[1]
    const rel = [...rels.matchAll(/<Relationship\b[^>]*>/g)].map(r => r[0]).find(r => r.includes(`Id="${rid}"`))
    const target = rel.match(/Target="([^"]*)"/)[1].replace(/^\/?(xl\/)?/, '')
    return { name, file: `xl/${target}` }
  })
  return {
    sheetNames: () => sheets.map(s => s.name),
    /** Every row of a sheet as an array of cell values (strings, numbers or null). */
    rows(sheetName) {
      const sheet = sheets.find(s => s.name === sheetName)
      if (!sheet) throw new Error(`no sheet "${sheetName}" in ${path}`)
      const xml = read(sheet.file)
      const rows = []
      for (const row of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
        const cells = []
        for (const c of row[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
          const type = c[2].match(/t="(\w+)"/)?.[1]
          const body = c[3] ?? ''
          let value = null
          if (type === 's') value = shared[Number(body.match(/<v>([\s\S]*?)<\/v>/)?.[1])]
          else if (type === 'inlineStr') value = textOf(body)
          else {
            const raw = body.match(/<v>([\s\S]*?)<\/v>/)?.[1]
            if (raw !== undefined) value = type === 'str' || type === 'e' ? decode(raw) : Number(raw)
          }
          cells[columnIndex(c[1])] = value
        }
        rows.push(Array.from(cells, v => v ?? null))
      }
      return rows
    },
  }
}
