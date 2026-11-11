<template lang="pug">
//- One food of Aminoprofile's dataset. The facts stand on the page (protein, score, the amino
//- acids, what to combine it with); how they are worked out sits behind (i) buttons, and where
//- the values come from in a closed Sources section. All of it is in the server-rendered HTML.
.page-wrapper
  .element-wrapper
    .element-body
      .content(v-if="food")
        nav.crumbs(aria-label="Breadcrumb")
          NuxtLink(to="/foods") Foods
          span.separator ›
          NuxtLink(:to="`/foods#${categoryAnchor(food.category)}`") {{ food.category }}
        h1 {{ food.name }}: amino acids and protein
        p.lead
          | {{ lead }}
          UiInfo(label="About the amino acid score")
            | The score is how far the shortest essential amino acid reaches, per gram of protein, as a share of what the FAO pattern for ages 3 and up asks. Protein that reaches 100% for every one is often called complete, a common name and not an FAO term. Not corrected for digestibility, so not a DIAAS.
            UiSource(cite="fao-2013: Table 5, p. 29, and p. 23")

        .sections
          section
            h2
              | Amino acids
              UiInfo(label="About the amino acid table")
                | Grams per 100 g of the edible food, and milligrams per gram of its protein. Needed is what one gram of protein should hold by the FAO pattern. Red is below it. Methionine counts with cystine and phenylalanine with tyrosine, so each pair shares one value. Protein is nitrogen x 6.25.
                UiSource(cite="fao-2013: Table 5, p. 29 | eu-1169-2011: Annex I, point 10")
            .table-scroll
              table
                thead
                  tr
                    th(scope="col") Amino acid
                    th.num(scope="col") g per 100 g
                    th.num(scope="col") mg per g protein
                    th.num(scope="col") Needed
                tbody
                  tr.protein
                    th(scope="row") Protein
                    td.num {{ food.protein === null ? '—' : food.protein.toFixed(1) }}
                    td.num
                    td.num
                  tr(v-for="row in rows" :key="row.key" :class="{ partner: !row.pair }")
                    th(scope="row") {{ row.name }}
                    td.num {{ row.grams === null ? '—' : row.grams.toFixed(3) }}
                    template(v-if="row.pair")
                      td.num.pair(:rowspan="row.pair.span" :class="{ short: row.pair.short, limiting: row.pair.limiting }")
                        | {{ row.pair.mgPerG ?? '—' }}
                        span.visually-hidden(v-if="row.pair.short")  (below what is needed)
                      td.num.pair.needed(:rowspan="row.pair.span") {{ row.pair.needed }}

          section(v-if="food.combinations.foods.length")
            h2
              | {{ food.combinations.kind === 'lifted-by' ? 'Combine it with' : 'It complements' }}
              UiInfo(:label="food.combinations.kind === 'lifted-by' ? 'About these combinations' : 'About these foods'")
                template(v-if="food.combinations.kind === 'lifted-by'") Foods from other groups whose protein makes up for what this food lacks. The amino acids of foods eaten together add up, so the score is for the two together. The amounts, {{ COMBINATION_PROTEIN }} g of protein with half from each, are Aminoprofile's own choice.
                template(v-else) This food reaches 100% on its own, so it can make up for foods that do not. These rise the most when half of their protein comes from this food instead, as the amino acids of foods eaten together add up. The amounts, {{ COMBINATION_PROTEIN }} g of protein together, are Aminoprofile's own choice.
                UiSource(cite="moughan-lim-2024: section 6.7 | fao-2013: p. 22")
            .table-scroll
              table
                thead
                  tr
                    th(scope="col") Food
                    th.num(scope="col") Amount (g)
                    th.num(scope="col") With this (g)
                    th.num(scope="col") Score together
                tbody
                  tr(v-for="c in food.combinations.foods" :key="c.id")
                    th(scope="row")
                      NuxtLink(:to="`/foods/${c.id}`") {{ c.name }}
                    td.num {{ c.gramsOfOther }}
                    td.num {{ c.gramsOfThis }}
                    td.num {{ c.score }}%#[span.note(v-if="c.limiting.length")  ({{ c.limiting.join(', ') }})]

          section(v-if="food.sameCategory.length")
            h2 More {{ food.category.toLowerCase() }}
            ul.related
              li(v-for="f in food.sameCategory" :key="f.id")
                NuxtLink(:to="`/foods/${f.id}`") {{ f.name }}

          details.sources
            summary Sources: {{ sourcesLine }}
            p.small Milligrams per gram of nitrogen, per laboratory or database that measured the value. A value one database copied from another counts once, and outliers are left out. Spread is the highest minus the lowest, as a share of the median.
              UiSource(cite="fao-infoods-2012 | greenfield-southgate-2003: chapters 9 and 10")
            .table-scroll
              table
                thead
                  tr
                    th(scope="col") Amino acid
                    th.num(v-for="origin in originColumns" :key="origin" scope="col") {{ origin }}
                    th.num(scope="col") Spread
                tbody
                  tr(v-for="aa in food.aminoAcids" :key="aa.key")
                    th(scope="row") {{ aa.name }}
                    td.num(v-for="origin in originColumns" :key="origin") {{ valueFrom(aa, origin) }}
                    td.num {{ aa.spread === null ? '—' : `${Math.round(aa.spread * 100)}%` }}
            ul.entries
              li(v-for="e in food.entries" :key="`${e.source}:${e.id}`")
                span.source {{ e.source }}
                span.id
                  a(v-if="e.url" :href="e.url" rel="nofollow") {{ e.id }}
                  template(v-else) {{ e.id }}
                span.name(:lang="nameLanguage(e.source)") {{ e.name }}
                span.relation(v-if="e.relation !== 'exact'") ({{ e.relation }} match)

        p.updated Aminoprofile foods dataset {{ food.version }} (a draft), #[a(href="https://creativecommons.org/licenses/by/4.0/") CC BY 4.0]. #[NuxtLink(to="/data") Method and downloads] · #[NuxtLink(to="/sources") Sources].
</template>

<script setup lang="ts">
import { SITE_NAME, SITE_URL } from '#shared/site';

definePageMeta({ layout: 'plain' });

// The same amount server/utils/foodPages.ts works the combinations out for.
const COMBINATION_PROTEIN = 20;

const route = useRoute();
const id = String(route.params.id);

// Rendered on the server: the first view needs no request from the browser.
const { data: food, error } = await useFetch(`/api/dataset/foods/${id}`, { key: `food-${id}` });
if (error.value || !food.value) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true });
}

const categoryAnchor = (category: string) => category.toLowerCase().replace(/[^a-z]+/g, '-');
const listOf = (items: string[]) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`);

/** The answer people come for: protein, score, and whether it is a complete protein. */
const lead = computed(() => {
  const f = food.value!;
  const parts: string[] = [];
  if (f.protein !== null) parts.push(`${f.protein.toFixed(1)} g protein per 100 g.`);
  if (f.score) {
    parts.push(f.score.limiting.length
      ? `Amino acid score ${f.score.percent}%, limited by ${listOf(f.score.limiting)}: not a complete protein on its own.`
      : `Amino acid score ${f.score.percent}%: a complete protein.`);
  }
  return parts.join(' ');
});

/**
 * The table rows in the order of the FAO pattern. Methionine and cystine share one value per g
 * protein and one Needed (the pattern counts them together), so the partner row has no cells of
 * its own there: the first row's cells span both. The same for phenylalanine and tyrosine.
 */
const rows = computed(() => {
  const f = food.value!;
  const byKey = Object.fromEntries(f.aminoAcids.map(a => [a.key, a]));
  return f.pattern.flatMap((p) => {
    const own = byKey[p.key]!;
    const pair = {
      mgPerG: p.mgPerG,
      needed: p.needed,
      short: p.percent !== null && p.percent < 100,
      limiting: f.score?.limiting.includes(p.name) ?? false,
      span: p.partner ? 2 : 1,
    };
    const first = { key: own.key, name: own.name, grams: own.grams, pair };
    if (!p.partner) return [first];
    const partner = byKey[p.partner]!;
    return [first, { key: partner.key, name: partner.name, grams: partner.grams, pair: null }];
  });
});

const sourcesLine = computed(() => {
  const f = food.value!;
  const count = f.independentSources === 1 ? 'one independent source' : `${f.independentSources} independent sources`;
  const agree = f.maxSpread === null ? '' : `, within ${Math.round(f.maxSpread * 100)}% of each other`;
  return `${count} (${listOf(f.origins)})${agree}`;
});

const originColumns = computed(() => {
  const names = new Set<string>();
  for (const aa of food.value!.aminoAcids) for (const o of aa.byOrigin) names.add(o.origin);
  return [...names].sort();
});

function valueFrom(aa: { byOrigin: { origin: string, mgPerGramNitrogen: number }[] }, origin: string): string {
  const found = aa.byOrigin.find(o => o.origin === origin);
  return found ? String(found.mgPerGramNitrogen) : '—';
}

// MEXT names are Japanese, as the database gives them; the others are English.
const nameLanguage = (source: string) => (source.startsWith('MEXT') ? 'ja' : 'en');

const f = food.value;
const url = `${SITE_URL}/foods/${f.id}`;
// Results show about 60 characters of a title and 160 of a description, so the longer food names
// get the shorter wording. The site's name stays last.
const fitting = (limit: number, ...options: string[]) => options.find(o => o.length <= limit) ?? options.at(-1)!;
const title = fitting(60,
  `${f.name}: amino acids and protein - ${SITE_NAME}`,
  `${f.name}: amino acids - ${SITE_NAME}`,
  `${f.name} - ${SITE_NAME}`);
const facts = [
  f.protein === null ? '' : `${f.protein.toFixed(1)} g protein per 100 g`,
  f.score ? `amino acid score ${f.score.percent}%${f.score.limiting.length ? `, limited by ${listOf(f.score.limiting)}` : ''}` : '',
].filter(Boolean).join(', ');
const description = fitting(160,
  `${f.name}: ${facts}. Every essential amino acid, from ${f.independentSources} food composition databases.`,
  `${f.name}: ${facts}.`);

useSeoMeta({ title, description, ogTitle: title, ogDescription: description, ogUrl: url });
useHead({
  link: [{ rel: 'canonical', href: url }],
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Foods', item: `${SITE_URL}/foods` },
        { '@type': 'ListItem', position: 2, name: f.category, item: `${SITE_URL}/foods#${categoryAnchor(f.category)}` },
        { '@type': 'ListItem', position: 3, name: f.name, item: url },
      ],
    }),
  }],
});
</script>

<style lang="scss" scoped>
.content {
  max-width: 720px;
  @include tablet-medium {
    padding: 0 1rem;
  }
  > h1 {
    margin-top: 1rem;
  }
}

.crumbs {
  margin-top: 2rem;
  display: flex;
  flex-wrap: wrap;
  column-gap: 0.5rem;
  color: $neutral-variant50-text;
  > a {
    color: $neutral-variant30;
  }
}

.lead {
  margin-top: 1rem;
}

.sections {
  display: flex;
  flex-direction: column;
  row-gap: 2.5rem;
  margin-top: 2rem;
  > section {
    display: flex;
    flex-direction: column;
    row-gap: 0.5rem;
  }
  h2 {
    font: bold 1.125rem/1.5625rem $mulish; // 18/25px
    color: $neutral-variant30;
  }
}

// Wide tables scroll sideways on phones instead of widening the page. The (i) buttons sit next
// to the headings, outside this box, because it would clip their panels.
.table-scroll {
  overflow-x: auto;
}

table {
  border-collapse: collapse;
  min-width: 100%;
  font-variant-numeric: tabular-nums;
  th, td {
    padding: 0.375rem 0.75rem 0.375rem 0;
    text-align: left;
    border-bottom: 1px solid $neutral-variant90;
    white-space: nowrap;
  }
  thead th {
    font-weight: bold;
    color: $neutral-variant30;
    border-bottom: 1px solid $colors--primary;
  }
  tbody th {
    font-weight: normal;
  }
  .num {
    text-align: right;
  }
  // A pair's shared cells sit in the middle of its two rows.
  .pair {
    vertical-align: middle;
  }
  // Cystine and tyrosine: the row that shares its partner's value per g protein.
  tr.partner > * {
    color: $neutral-variant50-text;
  }
  .short {
    color: $error40;
  }
  .limiting {
    font-weight: bold;
  }
  .needed {
    color: $neutral-variant50-text;
  }
  tr.protein > th {
    font-weight: bold;
  }
}

.note, .small {
  color: $neutral-variant50-text;
}

.small {
  font-size: 13px;
}

ul {
  padding-left: 1.25rem;
  display: flex;
  flex-direction: column;
  row-gap: 0.25rem;
}

.related {
  padding-left: 0;
  list-style: none;
  flex-direction: row;
  flex-wrap: wrap;
  column-gap: 1.25rem;
}

// Where the values come from: closed until opened, but in the HTML for whoever wants to check.
.sources {
  > summary {
    cursor: pointer;
    color: $neutral-variant30;
  }
  &[open] > summary {
    margin-bottom: 0.75rem;
  }
  > .small {
    margin-bottom: 0.5rem;
  }
  > .entries {
    margin-top: 1rem;
  }
}

.entries li {
  > span + span {
    margin-left: 0.5rem;
  }
  > .source {
    color: $neutral-variant30;
  }
  > .id {
    font-variant-numeric: tabular-nums;
  }
  > .relation {
    color: $neutral-variant50-text;
  }
}

a {
  color: $colors--primary;
}

.updated {
  margin-top: 3rem;
  font-size: 13px;
  color: $neutral-variant50-text;
}
</style>
