<template lang="pug">
//- Every source the site rests on, from shared/references.ts. The (i) panels link to the entries
//- here (#ref-<id>), and the navbar links to the page (quiet-functionalism guides/sources.md).
.page-wrapper
  .element-wrapper
    .element-body
      .content
        UiBack
        h1 Sources
        p.intro Everything Aminoprofile shows rests on the sources below. Each (i) on the site names the ones it uses and links to their entry here.
        .questions
          .question
            h2 Data
            ol
              li(v-for="r in data" :key="r.id" :id="`ref-${r.id}`" :class="{ arrived: route.hash === `#ref-${r.id}` }")
                | {{ r.full }} #[a(:href="r.url") {{ r.urlLabel }}]
                span.licence Licence: {{ r.licence }}
            p The values were changed: combined, converted and recalculated as the #[NuxtLink(to="/data") Data page] describes. No source endorses Aminoprofile.
          .question
            h2 Method and scoring
            ol(:start="data.length + 1")
              li(v-for="r in references" :key="r.id" :id="`ref-${r.id}`" :class="{ arrived: route.hash === `#ref-${r.id}` }")
                | {{ r.full }} #[a(:href="r.url") {{ r.urlLabel }}]
          .question
            h2 About Aminoprofile
            p Aminoprofile is a non-commercial, open-source project by Damian Schilder: no ads, no accounts, no paid features. The code is on #[a(href="https://github.com/damianschilder/aminoprofile") GitHub] under the MIT licence, and the dataset is under #[a(href="https://creativecommons.org/licenses/by/4.0/") CC BY 4.0].
            p A source that is missing, or a value that looks wrong? Send an email to #[a(href="mailto:parels.app@gmail.com") parels.app@gmail.com].
        p.updated Last updated: 11 November 2026
</template>

<script setup lang="ts">
import { SITE_NAME, SITE_URL } from '#shared/site';
import { REFERENCES } from '#shared/references';

definePageMeta({ layout: 'plain' });

const route = useRoute();
const data = REFERENCES.filter(r => r.kind === 'data');
const references = REFERENCES.filter(r => r.kind === 'reference');

const title = `Sources - ${SITE_NAME}`;
const description = 'The food composition databases and the FAO, EU and research sources behind Aminoprofile\'s protein and amino acid scores, with their licences.';
const url = `${SITE_URL}/sources`;

useSeoMeta({ title, description, ogTitle: title, ogDescription: description, ogUrl: url });
useHead({ link: [{ rel: 'canonical', href: url }] });
</script>

<style lang="scss" scoped>
// The layout and text styles of the data page.
.content {
  max-width: 720px;
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

.questions {
  display: flex;
  flex-direction: column;
  row-gap: 2rem;
  margin-top: 2.5rem;
  > .question {
    display: flex;
    flex-direction: column;
    row-gap: 0.5rem;
    > h2 {
      font: bold 1.125rem/1.5625rem $mulish; // 18/25px
      color: $neutral-variant30;
    }
  }
}

ol {
  padding-left: 1.5rem;
  display: flex;
  flex-direction: column;
  row-gap: 0.75rem;
  > li {
    overflow-wrap: anywhere;
    // Arriving from an (i): the entry stands out for a moment. A class from the route, as
    // :target does not follow a client-side navigation.
    scroll-margin-top: 1rem;
    &.arrived {
      animation: arrived 2.5s ease-out;
    }
  }
}

@keyframes arrived {
  from { background-color: $neutral-variant90; }
  to { background-color: transparent; }
}

@media (prefers-reduced-motion: reduce) {
  ol > li.arrived {
    animation: none;
    background-color: $neutral-variant90;
  }
}

.licence {
  display: block;
  font-size: 13px;
  color: $neutral-variant50-text;
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
