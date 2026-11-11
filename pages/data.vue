<template lang="pug">
.page-wrapper
  .element-wrapper
    .element-body
      .content
        UiBack
        h1 Data
        p.intro Aminoprofile publishes its own food dataset: the essential amino acids, cystine, tyrosine and protein of {{ count }} everyday foods, combined from four national food composition databases. For every value it records which laboratories or databases measured it and how far they agree, so you can judge it yourself.
        p.intro Every food has its own page, with its amino acid score and what to combine it with: #[NuxtLink(to="/foods") browse the foods].
        .questions
          .question
            h2 Downloads
            p #[a(href="/data/aminoprofile-foods.json") aminoprofile-foods.json]: everything. The values, per amino acid where each value comes from and how far the sources agree, the links to the source entries and the source releases with their checksums.
            p #[a(href="/data/aminoprofile-foods.csv") aminoprofile-foods.csv]: the values and a short quality summary per food, for spreadsheets.
            p Values are grams per 100 g edible portion. Protein is nitrogen x 6.25. Version {{ version }} (November 2026) is a draft: every link between a food and a source entry still has to be checked by a second person.
            UiSource(cite="eu-1169-2011: Annex I, point 10")
          .question
            h2 How the values are combined
            p Each food is linked by hand to matching entries in the four sources. The amino acids are compared per gram of nitrogen, and each laboratory or database that measured a value gets one vote, so a value one source copied from another never counts twice. Estimated values are only used where no source measured that amino acid, and the food is then marked as estimated for it.
            p The full method, the checks and the known limits are in the #[a(href="https://github.com/damianschilder/aminoprofile/blob/main/data/README.md") method description].
            UiSource(cite="fao-infoods-2012 | greenfield-southgate-2003: chapters 9 and 10")
          .question
            h2 Licence
            p The dataset is available under #[a(href="https://creativecommons.org/licenses/by/4.0/") CC BY 4.0]. You may use, share and adapt it, also commercially, as long as you credit Aminoprofile and the four databases it combines. Their full credits, their licences and what was changed are on the #[NuxtLink(to="/sources") Sources] page. No source endorses this dataset.
          .question
            h2 For AI agents
            p Aminoprofile also offers the dataset as a public MCP server, so AI assistants can look foods up and score combinations as a tool. It is read-only and needs no account. The address is #[code https://aminoprofile.com/mcp] (Streamable HTTP).
            p It has three tools. #[code search_foods] finds foods by name or category. #[code get_food] gives the protein and amino acids of one food, with its amino acid score and where the values come from. #[code score_foods] adds up foods in the amounts you give and scores the combination against the FAO pattern for ages 3 and up. Like the score on the site, it is not corrected for digestibility, so it is not a DIAAS.
            UiSource(cite="fao-2013: Table 5, p. 29 | moughan-lim-2024: section 6.7")
            p In Claude Code, run #[code claude mcp add --transport http aminoprofile https://aminoprofile.com/mcp]. In Claude (the website and the desktop app), go to Settings, Connectors, add a custom connector and paste the address. Other assistants that support remote MCP servers over Streamable HTTP take the same address.
          .question
            h2 Contact
            p Questions about the data, or a value that looks wrong? Send an email to #[a(href="mailto:parels.app@gmail.com") parels.app@gmail.com].
        p.updated Last updated: 11 November 2026
</template>

<script setup lang="ts">
import { SITE_NAME, SITE_URL } from '#shared/site';

definePageMeta({ layout: 'plain' });

// The count and version come from the dataset itself (the same request as /foods), so they
// cannot fall behind it.
const { data: list } = await useFetch('/api/dataset/foods', { key: 'food-list' });
const count = list.value?.count ?? 0;
const version = list.value?.version ?? '';

const title = `Data - ${SITE_NAME}`;
const description = `Aminoprofile's open food dataset: essential amino acids and protein of ${count} foods from four food composition databases, CC BY 4.0, with an MCP server for agents.`;
const url = `${SITE_URL}/data`;

// The dataset itself, for search engines and assistants (schema.org Dataset, as Google's dataset
// search reads it). Same version and sources as public/data/aminoprofile-foods.json.
const grams = (name: string) => ({ '@type': 'PropertyValue', name, unitText: 'g/100 g' });
const dataset = {
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: 'Aminoprofile foods',
  description: `The essential amino acids, cystine, tyrosine and protein of ${count} everyday foods, in grams per 100 g edible portion, combined from four national food composition databases: USDA FoodData Central, the German Bundeslebensmittelschlüssel, the Danish Frida and the Japanese MEXT amino acid tables. For every value the dataset records which laboratories or databases measured it and how far they agree.`,
  url,
  version,
  license: 'https://creativecommons.org/licenses/by/4.0/',
  creator: { '@type': 'Person', name: 'Damian Schilder' },
  isAccessibleForFree: true,
  inLanguage: 'en',
  keywords: ['amino acids', 'essential amino acids', 'protein', 'protein quality', 'amino acid score', 'food composition', 'nutrition'],
  isBasedOn: [
    { '@type': 'Dataset', name: 'USDA FoodData Central, SR Legacy', url: 'https://fdc.nal.usda.gov/' },
    { '@type': 'Dataset', name: 'Bundeslebensmittelschlüssel (BLS) 4.0, Max Rubner-Institut', url: 'https://doi.org/10.25826/Data20251217-134202-0' },
    { '@type': 'Dataset', name: 'Frida 5.5, the Danish Food Composition Database, DTU National Food Institute', url: 'https://doi.org/10.11583/DTU.29500682' },
    { '@type': 'Dataset', name: 'Standard Tables of Food Composition in Japan, Amino Acids (MEXT)', url: 'https://www.mext.go.jp/a_menu/syokuhinseibun/mext_00001.html' },
  ],
  distribution: [
    { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: `${SITE_URL}/data/aminoprofile-foods.json` },
    { '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: `${SITE_URL}/data/aminoprofile-foods.csv` },
  ],
  variableMeasured: [
    'Protein', 'Histidine', 'Isoleucine', 'Leucine', 'Lysine', 'Methionine', 'Cystine',
    'Phenylalanine', 'Tyrosine', 'Threonine', 'Tryptophan', 'Valine',
  ].map(grams),
};

useSeoMeta({ title, description, ogTitle: title, ogDescription: description, ogUrl: url });
useHead({
  link: [{ rel: 'canonical', href: url }],
  script: [{ type: 'application/ld+json', innerHTML: JSON.stringify(dataset) }],
});
</script>

<style lang="scss" scoped>
// The layout and text styles of the privacy page.
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
    row-gap: 0.25rem;
    > h2 {
      font: bold 1.125rem/1.5625rem $mulish; // 18/25px
      color: $neutral-variant30;
    }
  }
}

a {
  color: $colors--primary;
}

// The MCP address, tool names and the Claude Code command. Long ones may wrap on phones.
code {
  font-size: 0.875em;
  overflow-wrap: anywhere;
}

.updated {
  margin-top: 3rem;
  font-size: 13px;
  color: $neutral-variant50-text;
}
</style>
