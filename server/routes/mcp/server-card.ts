// The MCP Server Card (SEP-2127) of /mcp: who the server is and how to connect, for clients and
// registries that look before they connect. At <endpoint>/server-card, the place the extension
// reserves for it (experimental-ext-server-card, docs/discovery.md).
//
// A card does not list tools: those come from tools/list on a live connection. It is public,
// read-only metadata, so any origin may read it and it may be cached for an hour. The ETag lets
// a client ask "still the same?" and get a 304 without the body.

import { DATASET_VERSION, FOOD_COUNT, MCP_ENDPOINT_URL, MCP_PROTOCOL_VERSIONS } from '../../utils/mcpTools'

const CARD = {
  $schema: 'https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json',
  name: 'com.aminoprofile/aminoprofile',
  title: 'Aminoprofile',
  version: DATASET_VERSION,
  description: `Essential amino acids of ${FOOD_COUNT} everyday foods from four national databases, and amino acid scores.`,
  websiteUrl: 'https://aminoprofile.com',
  repository: { url: 'https://github.com/damianschilder/aminoprofile', source: 'github' },
  icons: [{ src: 'https://aminoprofile.com/icon-512.png', mimeType: 'image/png', sizes: ['512x512'] }],
  remotes: [{ type: 'streamable-http', url: MCP_ENDPOINT_URL, supportedProtocolVersions: MCP_PROTOCOL_VERSIONS }],
}

const BODY = JSON.stringify(CARD)
// The card only changes with a deploy (the dataset version is in it), so the version and length
// identify it well enough.
const ETAG = `"${DATASET_VERSION}-${BODY.length}"`

const HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, HEAD, OPTIONS',
  'access-control-allow-headers': 'content-type, if-none-match',
  'access-control-expose-headers': 'etag',
  'cache-control': 'public, max-age=3600',
  'etag': ETAG,
}

export default defineEventHandler((event) => {
  setResponseHeaders(event, HEADERS)
  if (event.method === 'OPTIONS') {
    setResponseStatus(event, 204)
    return ''
  }
  if (event.method !== 'GET' && event.method !== 'HEAD') {
    setResponseHeader(event, 'allow', 'GET, HEAD, OPTIONS')
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }
  if (getRequestHeader(event, 'if-none-match') === ETAG) {
    setResponseStatus(event, 304)
    return ''
  }
  setResponseHeader(event, 'content-type', 'application/mcp-server-card+json')
  return BODY
})
