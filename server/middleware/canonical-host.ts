// Aminoprofile lives on one address. When NUXT_CANONICAL_HOST is set (the Worker config sets it
// to aminoprofile.com), any other host name that reaches the Worker, such as
// www.aminoprofile.com, gets a permanent redirect to the same path on that host. Local
// development is left alone.
export default defineEventHandler((event) => {
  const canonical = useRuntimeConfig(event).canonicalHost
  if (!canonical) return
  const host = (getRequestHeader(event, 'host') || '').toLowerCase()
  if (host === canonical || /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return
  return sendRedirect(event, `https://${canonical}${event.path}`, 301)
})
