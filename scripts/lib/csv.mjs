// A small RFC 4180 CSV parser: quoted fields, doubled quotes, commas and newlines inside quotes.
// Returns objects keyed by the header row. Enough for the USDA FoodData Central CSV files.

export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else quoted = false
      } else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') { row.push(field); field = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += ch
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  const [head, ...body] = rows.filter(r => r.length > 1 || r[0] !== '')
  return body.map(r => Object.fromEntries(head.map((name, i) => [name.replace(/^﻿/, ''), r[i] ?? ''])))
}
