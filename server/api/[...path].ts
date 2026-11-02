// Any other /api address is a plain JSON 404, without rendering the Vue app for it.
export default defineEventHandler((event) => {
  setResponseHeader(event, 'cache-control', 'no-store')
  throw createError({ statusCode: 404, statusMessage: 'Not found' })
})
