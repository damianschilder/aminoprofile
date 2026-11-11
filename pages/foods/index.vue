<template lang="pug">
.page-wrapper
  .element-wrapper
    .element-body
      .content(v-if="list")
        UiBack
        h1 Amino acids of everyday foods
        p.intro
          | Protein and amino acid score of {{ list.count }} everyday foods, each combined from up to four national food composition databases.
          UiInfo(label="About the score and the sources")
            | The score is the essential amino acid that falls shortest per gram of protein, as a share of the FAO (2013) pattern for ages 3 and up. 100% or more means a complete protein. Not corrected for digestibility, so not a DIAAS. The sources are USDA, Germany's BLS, Denmark's Frida and Japan's MEXT tables.
        nav.categories(aria-label="Food groups")
          a(v-for="c in list.categories" :key="c.name" :href="`#${categoryAnchor(c.name)}`") {{ c.name }}
        section(v-for="c in list.categories" :key="c.name" :id="categoryAnchor(c.name)")
          h2 {{ c.name }}
          .table-scroll
            table
              thead
                tr
                  th(scope="col") Food
                  th.num(scope="col") Protein, g per 100 g
                  th.num(scope="col") Score
                  th(scope="col") Limited by
              tbody
                tr(v-for="f in c.foods" :key="f.id")
                  th(scope="row")
                    NuxtLink(:to="`/foods/${f.id}`") {{ f.name }}
                  td.num {{ f.protein === null ? '—' : f.protein.toFixed(1) }}
                  td.num {{ f.score === null ? '—' : `${f.score}%` }}
                  td {{ f.limiting.length ? f.limiting.join(', ') : '—' }}
        p.updated Aminoprofile foods dataset, version {{ list.version }} (a draft), under #[a(href="https://creativecommons.org/licenses/by/4.0/") CC BY 4.0]. #[NuxtLink(to="/data") Downloads, method and sources].
</template>

<script setup lang="ts">
import { SITE_NAME, SITE_URL } from '#shared/site';

definePageMeta({ layout: 'plain' });

// Rendered on the server: the first view needs no request from the browser.
const { data: list } = await useFetch('/api/dataset/foods', { key: 'food-list' });

const categoryAnchor = (category: string) => category.toLowerCase().replace(/[^a-z]+/g, '-');

const count = list.value?.count ?? 0;
const title = `Amino acid scores and protein of ${count} foods - ${SITE_NAME}`;
const description = `Protein, essential amino acids and amino acid score of ${count} everyday foods, from eggs and cheese to lentils and oats, from four food composition databases.`;
const url = `${SITE_URL}/foods`;

useSeoMeta({ title, description, ogTitle: title, ogDescription: description, ogUrl: url });
useHead({ link: [{ rel: 'canonical', href: url }] });
</script>

<style lang="scss" scoped>
.content {
  max-width: 820px;
  @include tablet-medium {
    padding: 0 1rem;
  }
  > h1 {
    margin-top: 2rem;
  }
}

.intro {
  margin-top: 1rem;
}

.categories {
  margin-top: 1.5rem;
  display: flex;
  flex-wrap: wrap;
  column-gap: 1.25rem;
  row-gap: 0.25rem;
}

section {
  margin-top: 2.5rem;
  > h2 {
    font: bold 1.125rem/1.5625rem $mulish; // 18/25px
    color: $neutral-variant30;
    margin-bottom: 0.5rem;
  }
}

.table-scroll {
  overflow-x: auto;
}

table {
  border-collapse: collapse;
  width: 100%;
  font-variant-numeric: tabular-nums;
  th, td {
    padding: 0.375rem 0.75rem 0.375rem 0;
    text-align: left;
    border-bottom: 1px solid $neutral-variant90;
  }
  thead th {
    font-weight: bold;
    color: $neutral-variant30;
    border-bottom: 1px solid $colors--primary;
    white-space: nowrap;
  }
  tbody th {
    font-weight: normal;
  }
  .num {
    text-align: right;
    white-space: nowrap;
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
