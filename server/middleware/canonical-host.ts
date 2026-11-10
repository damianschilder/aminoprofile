// Aminoprofile lives on one address. When NUXT_CANONICAL_HOST is set (the Worker config sets it
// to aminoprofile.com), any other host name that reaches the Worker, such as
// www.aminoprofile.com, gets a permanent redirect to the same path on that host. Local
// development is left alone.
//
// GET and HEAD get a 301. Anything else gets a 308, which keeps the method and the body: many
// clients turn a POST that gets a 301 into a GET, and an MCP client given the www address of /mcp
// would then get a 405 instead of an answer.
export default defineEventHandler((event) => {
  const canonical = useRuntimeConfig(event).canonicalHost
  if (!canonical) return
  const host = (getRequestHeader(event, 'host') || '').toLowerCase()
  if (host === canonical || /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return
  const keepsMethod = event.method !== 'GET' && event.method !== 'HEAD'
  return sendRedirect(event, `https://${canonical}${event.path}`, keepsMethod ? 308 : 301)
})
