// End-to-end check of the agent endpoint (server/routes/mcp.ts) with the official MCP client.
//
//   node scripts/check-mcp.mjs [url]     default http://127.0.0.1:3000/mcp
//
// Connects twice, once on protocol revision 2026-07-28 (server/discover) and once with the
// 2025 `initialize` handshake, lists the tools and calls each with a realistic case. Then asks
// for an `initialize` on each older revision the server should still accept, and reads the
// server card. Prints one line per check and exits 1 when any fails.

import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client'

const url = new URL(process.argv[2] ?? 'http://127.0.0.1:3000/mcp')
const results = []

function check(name, ok, detail = '') {
  results.push({ name, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`)
}

async function attempt(name, fn) {
  try {
    await fn()
  } catch (error) {
    check(name, false, error?.message ?? String(error))
  }
}

async function checkTools(label, client) {
  const { tools } = await client.listTools()
  const names = tools.map(t => t.name).sort()
  check(`${label} tools/list`, names.join(',') === 'get_food,score_foods,search_foods', names.join(', '))
  check(`${label} tools are read-only with an output schema`,
    tools.every(t => t.annotations?.readOnlyHint === true && t.annotations?.idempotentHint === true && t.annotations?.openWorldHint === false && t.outputSchema))

  const search = await client.callTool({ name: 'search_foods', arguments: { query: 'cheese' } })
  const found = search.structuredContent
  // Quark matches too, on its alias "fresh cheese".
  const cheeseIds = found?.foods.map(f => f.id) ?? []
  check(`${label} search_foods "cheese"`, !search.isError && found.total >= 5 && ['cheese-gouda', 'cheese-cheddar', 'cottage-cheese'].every(id => cheeseIds.includes(id)),
    `${found?.total} matches: ${found?.foods.map(f => f.id).join(', ')}`)

  const all = await client.callTool({ name: 'search_foods', arguments: { limit: 64 } })
  check(`${label} search_foods empty query lists all`, all.structuredContent?.total === 64, `${all.structuredContent?.total} foods`)

  const egg = await client.callTool({ name: 'get_food', arguments: { id: 'egg-whole-raw' } })
  const e = egg.structuredContent
  check(`${label} get_food egg-whole-raw scores over 100`, !egg.isError && e.amino_acid_score.percent > 100 && e.licence === 'CC BY 4.0',
    `${e?.per_100g.protein} g protein, score ${e?.amino_acid_score.percent}%, ${e?.quality.independent_sources} sources`)

  const flour = await client.callTool({ name: 'score_foods', arguments: { items: [{ id: 'wheat-flour-white', grams: 100 }] } })
  const f = flour.structuredContent
  check(`${label} score_foods flour alone limited by lysine`, f?.amino_acid_score.limiting.includes('lysine'),
    `${f?.amino_acid_score.percent}%, limiting ${f?.amino_acid_score.limiting.join(', ')}`)

  const meal = await client.callTool({ name: 'score_foods', arguments: { items: [
    { id: 'oats-rolled', grams: 60 }, { id: 'milk-whole', grams: 250 }, { id: 'peanut-butter', grams: 30 },
  ] } })
  const m = meal.structuredContent
  check(`${label} score_foods oats 60 g + milk 250 g + peanut butter 30 g`,
    !meal.isError && m.totals_g.protein > 15 && m.amino_acid_score.percent > 0 && Object.keys(m.amino_acid_score.per_amino_acid).length === 9
      && m.notes.some(n => n.includes('DIAAS')) && m.unknown_ids.length === 0,
    `${m?.totals_g.protein} g protein, ${m?.totals_g.lysine} g lysine, score ${m?.amino_acid_score.percent}%, limiting ${m?.amino_acid_score.limiting.join(', ')}`)

  const unknown = await client.callTool({ name: 'get_food', arguments: { id: 'eggs-raw' } })
  check(`${label} get_food unknown id is an error with close ids`, unknown.isError === true && /egg-/.test(unknown.content[0]?.text ?? ''),
    unknown.content[0]?.text)
}

async function connectAndCheck(label, versionNegotiation) {
  const client = new Client({ name: 'aminoprofile-check', version: '1.0.0' }, versionNegotiation ? { versionNegotiation } : {})
  await client.connect(new StreamableHTTPClientTransport(url))
  const info = client.getServerVersion()
  check(`${label} connect`, info?.name === 'aminoprofile' && /DIAAS/.test(client.getInstructions() ?? ''),
    `protocol ${client.getNegotiatedProtocolVersion()}, server ${info?.name} ${info?.version}`)
  await checkTools(label, client)
  await client.close()
}

await attempt('2026-07-28', () => connectAndCheck('2026-07-28', { mode: { pin: '2026-07-28' } }))
await attempt('2025 initialize', () => connectAndCheck('2025', null))

// The older revisions by hand: the client always offers its newest one.
for (const version of ['2025-11-25', '2025-06-18', '2025-03-26', '1999-01-01']) {
  await attempt(`initialize ${version}`, async () => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'accept': 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {
        protocolVersion: version, capabilities: {}, clientInfo: { name: 'aminoprofile-check', version: '1.0.0' },
      } }),
    })
    const body = await response.json()
    const answered = body.result?.protocolVersion
    const expected = version === '1999-01-01' ? '2025-11-25' : version
    check(`initialize ${version}`, response.status === 200 && answered === expected && response.headers.get('access-control-allow-origin') === '*',
      `${response.status}, answered ${answered}, ${response.headers.get('content-type')}`)
  })
}

await attempt('server card', async () => {
  const response = await fetch(new URL('mcp/server-card', url.origin + '/'))
  const card = await response.json()
  check('server card', response.status === 200 && card.name === 'com.aminoprofile/aminoprofile' && !('tools' in card)
    && card.remotes?.[0]?.supportedProtocolVersions?.includes('2026-07-28'),
    `${response.status}, ${response.headers.get('content-type')}, ${card.remotes?.[0]?.supportedProtocolVersions?.join(' ')}`)
})

const failed = results.filter(r => !r.ok).length
console.log(`\n${results.length - failed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
