// One food of Aminoprofile's own dataset, worked out for its page (pages/foods/[id].vue): the
// amino acids, the score, how far the sources agree and what to combine it with.
// 404 for an id that is not in the dataset.

import { foodPage } from '../../../utils/foodPages'

export default defineEventHandler((event) => {
  const page = foodPage(getRouterParam(event, 'id') ?? '')
  if (!page) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({ statusCode: 404, statusMessage: 'Food not found' })
  }
  setResponseHeader(event, 'cache-control', 'public, max-age=3600')
  return page
})
