// Checks the site's citations against shared/references.ts (quiet-functionalism guides/sources.md):
// every <UiSource cite="..."> names references that exist, and every method reference is cited
// at least once. Data sources need no mark: the sources page lists them and the food pages link
// each entry to its original. Exits 1 on a failure.
//   node scripts/check-references.mjs
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { REFERENCES, REFERENCE_BY_ID, parseCite } from '../shared/references.ts';

const ROOTS = ['pages', 'components', 'layouts'];

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (path.endsWith('.vue')) yield path;
  }
}

const problems = [];
const cited = new Map();
for (const root of ROOTS) {
  for (const file of files(root)) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(/UiSource\(cite="([^"]*)"\)/g)) {
      const line = text.slice(0, match.index).split('\n').length;
      for (const { id } of parseCite(match[1])) {
        if (!REFERENCE_BY_ID.has(id)) problems.push(`${file}:${line}: unknown reference "${id}"`);
        cited.set(id, (cited.get(id) ?? 0) + 1);
      }
    }
  }
}

const ids = new Set();
for (const r of REFERENCES) {
  if (ids.has(r.id)) problems.push(`shared/references.ts: "${r.id}" twice`);
  ids.add(r.id);
  if (r.kind === 'data' && !r.licence) problems.push(`shared/references.ts: data source "${r.id}" has no licence (write "none stated" if it states none)`);
  if (r.kind === 'reference' && !cited.has(r.id)) problems.push(`shared/references.ts: "${r.id}" is cited nowhere`);
}

const marks = [...cited.values()].reduce((a, b) => a + b, 0);
console.log(`${REFERENCES.length} references, ${marks} marks in ${ROOTS.join(', ')}, ${problems.length} problems`);
for (const p of problems) console.log(`  ${p}`);
process.exit(problems.length ? 1 : 0);
