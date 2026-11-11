// How Aminoprofile finds a food by what someone types, the same on the home page (stores/foods.ts,
// in the browser) and for agents (server/utils/mcpTools.ts). Accents are removed and case is
// ignored ("maïs" finds "mais"), a trailing "s" is dropped from words longer than three letters
// ("eggs" finds "egg"), and every typed word must match the start of a word of the food: of its
// name, an alias (English, Dutch and other names people use) or its id.

export interface SearchableFood {
  id: string
  name: string
  category: string
  aliases: readonly string[]
}

export function searchWords(value: string): string[] {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    // Turkish dotless i has no accent to strip ("kıyma", "ıspanak"), and ß is ss.
    .replace(/ı/g, 'i')
    .replace(/ß/g, 'ss')
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map(w => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w))
}

interface Entry<T> {
  food: T
  index: number
  name: string[]
  /** The name's words and the aliases' words together. */
  all: string[]
}

const indexes = new WeakMap<readonly SearchableFood[], Entry<SearchableFood>[]>()

function indexOf<T extends SearchableFood>(foods: readonly T[]): Entry<T>[] {
  let entries = indexes.get(foods) as Entry<T>[] | undefined
  if (!entries) {
    entries = foods.map((food, index) => {
      const name = searchWords(food.name)
      return { food, index, name, all: [...name, ...searchWords([...food.aliases, food.id].join(' '))] }
    })
    indexes.set(foods, entries as Entry<SearchableFood>[])
  }
  return entries
}

const hasAll = (have: string[], wanted: string[]) => wanted.every(w => have.some(h => h.startsWith(w)))
const hasAllWhole = (have: string[], wanted: string[]) => wanted.every(w => have.includes(w))

/**
 * The foods that match every typed word, best first: whole words of the name, then the start of
 * words of the name, then whole words of an alias (where "kip" finds chicken before "kippenei"
 * finds the egg), then the start of an alias's words. Within each, in the order of the dataset.
 * An empty query matches every food. The food group is not searched: "Meat and fish" would make
 * "fish" find the chicken. `category` keeps only that food group.
 */
export function matchFoods<T extends SearchableFood>(foods: readonly T[], query: string, category?: string): T[] {
  const wanted = searchWords(query)
  const wantedCategory = category?.trim().toLowerCase()
  return indexOf(foods)
    .filter(e => !wantedCategory || e.food.category.toLowerCase() === wantedCategory)
    .map((e) => {
      if (hasAllWhole(e.name, wanted)) return { e, rank: 0 }
      if (hasAll(e.name, wanted)) return { e, rank: 1 }
      if (hasAllWhole(e.all, wanted)) return { e, rank: 2 }
      if (hasAll(e.all, wanted)) return { e, rank: 3 }
      return null
    })
    .filter(r => r !== null)
    .sort((a, b) => a.rank - b.rank || a.e.index - b.e.index)
    .map(r => r.e.food)
}
