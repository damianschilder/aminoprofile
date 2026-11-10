<template lang="pug">
.page-wrapper
  .element-wrapper
    .element-body
      .content(v-if="food")
        nav.crumbs(aria-label="Breadcrumb")
          NuxtLink(to="/foods") Foods
          span.separator ›
          NuxtLink(:to="`/foods#${categoryAnchor(food.category)}`") {{ food.category }}
        h1 {{ food.name }}: amino acids and protein
        p.intro {{ summary }}
        p.intro(v-if="completeness") {{ completeness }}

        .sections
          section
            h2 Amino acid score
            p The score compares the protein of this food with the FAO (2013) amino acid pattern for ages 3 and up: for each essential amino acid, the milligrams per gram of protein as a share of what the pattern asks. Methionine counts together with cystine and phenylalanine with tyrosine, as in the pattern. The lowest share is the score. It is not corrected for digestibility, so it is not a DIAAS.
            .table-scroll
              table
                thead
                  tr
                    th(scope="col") Amino acid
                    th.num(scope="col") mg per g protein
                    th.num(scope="col") FAO pattern
                    th.num(scope="col") Share
                tbody
                  tr(v-for="row in food.pattern" :key="row.name" :class="{ limiting: isLimiting(row.name) }")
                    th(scope="row") {{ capitalise(row.name) }}
                    td.num {{ row.mgPerG ?? '—' }}
                    td.num {{ row.needed }}
                    td.num {{ row.percent === null ? '—' : `${row.percent}%` }}

          section
            h2 Amino acids per 100 g
            p Grams per 100 g of the edible food, and milligrams per gram of its protein. Protein is nitrogen x 6.25.
            .table-scroll
              table
                thead
                  tr
                    th(scope="col") Amino acid
                    th.num(scope="col") g per 100 g
                    th.num(scope="col") mg per g protein
                tbody
                  tr.protein
                    th(scope="row") Protein
                    td.num {{ food.protein === null ? '—' : food.protein.toFixed(1) }}
                    td.num
                  tr(v-for="aa in food.aminoAcids" :key="aa.key")
                    th(scope="row") {{ aa.name }}#[span.note(v-if="!aa.essential")  (not essential)]
                    td.num {{ aa.grams === null ? '—' : aa.grams.toFixed(3) }}
                    td.num {{ aa.perGramProtein ?? '—' }}

          section(v-if="food.combinations.foods.length")
            template(v-if="food.combinations.kind === 'lifted-by'")
              h2 What to combine it with
              p Foods from other groups whose protein makes up for what this food lacks. The score is for the two together, with half of the protein from each: {{ COMBINATION_PROTEIN }} g of protein in the amounts shown.
            template(v-else)
              h2 What it complements
              p {{ food.name }} scores 100% or more on its own, so it can make up for foods that score lower. These rise the most when half of their protein is replaced by protein from this food: {{ COMBINATION_PROTEIN }} g of protein in the amounts shown.
            .table-scroll
              table
                thead
                  tr
                    th(scope="col") Together with
                    th.num(scope="col") g of it
                    th.num(scope="col") g of {{ food.name }}
                    th.num(scope="col") Score together
                    th(scope="col") Limited by
                tbody
                  tr(v-for="c in food.combinations.foods" :key="c.id")
                    th(scope="row")
                      NuxtLink(:to="`/foods/${c.id}`") {{ c.name }}
                    td.num {{ c.gramsOfOther }}
                    td.num {{ c.gramsOfThis }}
                    td.num {{ c.score }}%
                    td {{ c.limiting.length ? c.limiting.join(', ') : '—' }}

          section
            h2 How far the sources agree
            p Each value is the median of the laboratories and databases that measured it, compared per gram of nitrogen so that differences in water content do not count. A value one database copied from another counts once. Milligrams per gram of nitrogen:
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
            p.small Spread is the difference between the highest and the lowest value as a share of the median. Values left out as outliers are not shown. #[template(v-if="food.independentSources < 2") For at least one essential amino acid only one source measured a value.]

          section
            h2 Source entries
            p The entries in the source databases that this food is combined from (#[NuxtLink(to="/data") about the sources]).
            ul.entries
              li(v-for="e in food.entries" :key="`${e.source}:${e.id}`")
                span.source {{ e.source }}
                span.id
                  a(v-if="e.url" :href="e.url" rel="nofollow") {{ e.id }}
                  template(v-else) {{ e.id }}
                span.name(:lang="nameLanguage(e.source)") {{ e.name }}
                span.relation(v-if="e.relation !== 'exact'") ({{ e.relation }} match)

          section(v-if="food.sameCategory.length")
            h2 More {{ food.category.toLowerCase() }}
            ul.related
              li(v-for="f in food.sameCategory" :key="f.id")
                NuxtLink(:to="`/foods/${f.id}`") {{ f.name }}

        p.updated From the Aminoprofile foods dataset, version {{ food.version }} (a draft), under #[a(href="https://creativecommons.org/licenses/by/4.0/") CC BY 4.0]. #[NuxtLink(to="/data") Downloads, method and sources].
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

const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const categoryAnchor = (category: string) => category.toLowerCase().replace(/[^a-z]+/g, '-');

const isLimiting = (patternName: string) => food.value!.score?.limiting.includes(patternName) ?? false;

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

const listOf = (items: string[]) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`);

const summary = computed(() => {
  const f = food.value!;
  const parts: string[] = [];
  if (f.protein !== null) parts.push(`${f.name} has ${f.protein.toFixed(1)} g of protein per 100 g.`);
  if (f.score) {
    parts.push(f.score.limiting.length
      ? `Its amino acid score is ${f.score.percent}%, limited by ${listOf(f.score.limiting)}.`
      : `Its amino acid score is ${f.score.percent}%: every essential amino acid meets the FAO pattern.`);
  }
  const sources = f.independentSources === 1 ? 'one independent source' : `${f.independentSources} independent sources`;
  parts.push(`The values combine ${sources} (${listOf(f.origins)})${f.maxSpread !== null ? `, which differ by at most ${Math.round(f.maxSpread * 100)}% on an essential amino acid` : ''}.`);
  return parts.join(' ');
});

/** The everyday question, answered by the score: a "complete protein" meets the pattern. */
const completeness = computed(() => {
  const f = food.value!;
  if (!f.score) return '';
  return f.score.limiting.length
    ? `Is it a complete protein? Not on its own by this measure: it has less ${listOf(f.score.limiting)} per gram of protein than the pattern asks. Combined with other protein during the day, that can be made up.`
    : `Is it a complete protein? By this measure, yes: it has at least as much of every essential amino acid per gram of protein as the pattern asks.`;
});

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
  max-width: 820px;
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

.intro {
  margin-top: 1rem;
}

.sections {
  display: flex;
  flex-direction: column;
  row-gap: 2.5rem;
  margin-top: 2.5rem;
  > section {
    display: flex;
    flex-direction: column;
    row-gap: 0.5rem;
    > h2 {
      font: bold 1.125rem/1.5625rem $mulish; // 18/25px
      color: $neutral-variant30;
    }
  }
}

// Wide tables scroll sideways on phones instead of widening the page.
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
  tr.limiting {
    color: $colors--primary;
    font-weight: bold;
    > th {
      font-weight: bold;
    }
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

.related {
  padding-left: 0;
  list-style: none;
  flex-direction: row;
  flex-wrap: wrap;
  column-gap: 1.25rem;
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
