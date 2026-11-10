// The agent endpoint: a public, read-only MCP server (Model Context Protocol) at /mcp, so an AI
// assistant can search the curated foods, read one and score a meal with the same numbers the
// site shows. The tools themselves are in server/utils/mcpTools.ts.
//
// Transport: Streamable HTTP, stateless. Every request gets a fresh server from the official SDK
// (@modelcontextprotocol/server v2), so nothing is kept between requests and the Worker can
// answer from any location. Two eras of the protocol are served:
// - 2026-07-28: per-request envelope, `server/discover`, no sessions. Served by the SDK's
//   createMcpHandler, which also checks the MCP-Protocol-Version, Mcp-Method and Mcp-Name headers.
// - 2025-11-25, 2025-06-18 and 2025-03-26: the `initialize` handshake. Routed here with the SDK's
//   own isLegacyRequest to a stateless transport that answers in JSON, not as an event stream
//   (the SDK's built-in fallback streams, and nothing here ever needs a stream).
//
// Answers:
// - POST: JSON-RPC, answered with JSON (202 without a body for a notification).
// - OPTIONS: the CORS preflight, 204.
// - GET and DELETE: 405 with Allow. There is no session to open a stream on or to end.
// - 403 for a malformed Origin (see allowedOrigin below), 413 for a body over 64 KiB.
// Every answer allows any origin and is never cached.

import {
  createMcpHandler,
  isLegacyRequest,
  McpServer,
  WebStandardStreamableHTTPServerTransport,
} from '@modelcontextprotocol/server'
import type { H3Event } from 'h3'
// Imported by name rather than left to Nitro's auto-import: a missed auto-import only shows up as
// a 500 in the deployed Worker.
import {
  CATEGORIES,
  DATA_PAGE_URL,
  DATASET_VERSION,
  FOOD_COUNT,
  getFood,
  getFoodInput,
  getFoodOutput,
  LICENCE,
  MCP_PROTOCOL_VERSIONS,
  scoreFoods,
  scoreFoodsInput,
  scoreFoodsOutput,
  searchFoods,
  searchFoodsInput,
  searchFoodsOutput,
} from '../utils/mcpTools'

// The largest real request (score_foods with 30 items) is about 2 kB.
const MAX_BODY_BYTES = 64 * 1024

const INSTRUCTIONS = [
  'Aminoprofile (https://aminoprofile.com) compares the essential amino acids of everyday foods.',
  `The tools read a curated dataset of ${FOOD_COUNT} foods that combines four national food composition databases (USDA, BLS/Max Rubner-Institut, Frida/DTU, MEXT) and records how far they agree.`,
  'All amounts are grams per 100 g of edible food unless a tool says otherwise.',
  'Use search_foods to find a food id, get_food for its values, and score_foods to score a meal or a day.',
  'The score is an amino acid score against the FAO (2013) pattern for ages 3 and up. It is not a DIAAS: it is not corrected for digestibility, which lowers most plant foods.',
  `When you use the values, credit the Aminoprofile dataset (${LICENCE}, ${DATA_PAGE_URL}).`,
].join(' ')

const READ_ONLY = { readOnlyHint: true, idempotentHint: true, openWorldHint: false } as const

/** A fresh server with the three tools, one per request. */
function createServer(): McpServer {
  const server = new McpServer(
    { name: 'aminoprofile', title: 'Aminoprofile', version: DATASET_VERSION, websiteUrl: 'https://aminoprofile.com' },
    { instructions: INSTRUCTIONS, supportedProtocolVersions: MCP_PROTOCOL_VERSIONS },
  )
  server.registerTool('search_foods', {
    title: 'Search foods',
    description: `Find foods in the Aminoprofile dataset by name, alias or id. Every word must match (case-insensitive; "eggs" finds "egg"). An empty query lists all foods, optionally in one category. Categories: ${CATEGORIES.join(', ')}. Returns ids for get_food and score_foods.`,
    inputSchema: searchFoodsInput,
    outputSchema: searchFoodsOutput,
    annotations: { title: 'Search foods', ...READ_ONLY },
  }, async input => searchFoods(input))
  server.registerTool('get_food', {
    title: 'Get a food',
    description: 'The essential amino acids, cystine, tyrosine and protein of one food in grams per 100 g, its amino acid score on its own, how many independent sources agree on the values, and where they come from.',
    inputSchema: getFoodInput,
    outputSchema: getFoodOutput,
    annotations: { title: 'Get a food', ...READ_ONLY },
  }, async input => getFood(input))
  server.registerTool('score_foods', {
    title: 'Score a combination of foods',
    description: 'Add up foods in given amounts (a meal or a day) and score the protein of the combination against the FAO (2013) amino acid pattern for ages 3 and up. Shows the limiting amino acid and the score of each one. Not a DIAAS: not corrected for digestibility.',
    inputSchema: scoreFoodsInput,
    outputSchema: scoreFoodsOutput,
    annotations: { title: 'Score a combination of foods', ...READ_ONLY },
  }, async input => scoreFoods(input))
  return server
}

// The 2026-07-28 leg. Created once per Worker instance; it makes a server per request itself.
// `legacy: 'reject'` because 2025-era requests never reach it (see handlePost).
const modern = createMcpHandler(() => createServer(), {
  legacy: 'reject',
  responseMode: 'json',
  maxRequestBodySize: MAX_BODY_BYTES,
})

async function handlePost(request: Request): Promise<Response> {
  if (await isLegacyRequest(request, undefined, { maxRequestBodySize: MAX_BODY_BYTES })) {
    const server = createServer()
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
      maxRequestBodySize: MAX_BODY_BYTES,
    })
    await server.connect(transport)
    try {
      return await transport.handleRequest(request)
    } finally {
      // The JSON answer is complete by now, so closing frees the server without cutting it off.
      await server.close()
    }
  }
  return modern.fetch(request)
}

const MCP_CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type, accept, mcp-protocol-version, mcp-session-id, mcp-method, mcp-name, authorization',
  'access-control-expose-headers': 'mcp-protocol-version, mcp-session-id',
  'access-control-max-age': '86400',
  'cache-control': 'no-store',
}

/**
 * The spec asks servers to check Origin against DNS rebinding: a web page that makes a browser
 * talk to a server on the visitor's own machine or network. This server is public, holds no
 * credentials and answers every origin with CORS *, so there is nothing a page could reach here
 * that it could not fetch anyway. What is left is to refuse what no real browser page sends: no
 * Origin (server-side clients) is fine, as is any well-formed https origin and a local
 * http://localhost or http://127.0.0.1 page; `null` (sandboxed frames, file: pages) and anything
 * malformed get 403.
 */
function allowedOrigin(origin: string | null): boolean {
  if (origin === null) return true
  let url: URL
  try {
    url = new URL(origin)
  } catch {
    return false
  }
  // An origin is scheme, host and port only: anything after it means it is not one.
  if (url.origin !== origin.replace(/\/$/, '')) return false
  if (url.protocol === 'https:') return true
  return url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
}

function jsonRpcError(status: number, message: string, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message }, id: null }), {
    status,
    headers: { 'content-type': 'application/json', ...extraHeaders },
  })
}

async function answer(event: H3Event): Promise<Response> {
  const method = event.method
  if (method === 'OPTIONS') return new Response(null, { status: 204 })
  if (!allowedOrigin(getRequestHeader(event, 'origin') ?? null)) return jsonRpcError(403, 'Forbidden: invalid Origin header')
  if (method !== 'POST') {
    return jsonRpcError(405, 'Method not allowed: this stateless server only takes POST', { allow: 'POST, OPTIONS' })
  }
  return handlePost(toWebRequest(event))
}

export default defineEventHandler(async (event) => {
  const response = await answer(event)
  // A new Response, because the SDK's may have immutable headers; the body is passed on as is.
  const headers = new Headers(response.headers)
  for (const [name, value] of Object.entries(MCP_CORS_HEADERS)) headers.set(name, value)
  if (response.status === 405) headers.set('allow', 'POST, OPTIONS')
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
})
