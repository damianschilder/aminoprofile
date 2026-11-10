// The list of foods in Aminoprofile's own dataset, for pages/foods/index.vue: name, protein,
// amino acid score and limiting amino acid, by category. The page renders on the server, so a
// visitor's first view needs no request here; this answers when the browser navigates to it.

import { foodList } from '../../utils/foodPages'

export default defineEventHandler((event) => {
  // The dataset only changes with a deploy.
  setResponseHeader(event, 'cache-control', 'public, max-age=3600')
  return foodList()
})
