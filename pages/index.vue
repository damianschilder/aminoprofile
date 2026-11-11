<template lang="pug">
.page-wrapper
  UiSearch
</template>

<script setup lang="ts">
import { SITE_NAME, SITE_URL } from '#shared/site';

const title = `${SITE_NAME} - Compare the essential amino acids of foods`;
const description = 'Search Aminoprofile\'s dataset of everyday foods and compare their essential amino acids and protein side by side, for any amount. No account, no cookies.';
const url = `${SITE_URL}/`;

useSeoMeta({ title, description, ogTitle: title, ogDescription: description, ogUrl: url });

useHead({
  link: [{ rel: 'canonical', href: url }],
  // What the page is, for search engines and assistants (schema.org). WebSite with name and url is
  // what Google reads for the site name in results.
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify([{
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url,
    }, {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: SITE_NAME,
      url,
      description,
      applicationCategory: 'HealthApplication',
      operatingSystem: 'Any',
      browserRequirements: 'Requires JavaScript. Made for desktop screens (1240 pixels wide or more).',
      inLanguage: 'en',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      isBasedOn: [
        // Aminoprofile's own dataset, which the search runs over. pages/data.vue describes it in full.
        { '@type': 'Dataset', name: 'Aminoprofile foods', url: `${SITE_URL}/data`, license: 'https://creativecommons.org/licenses/by/4.0/' },
      ],
    }]),
  }],
});
</script>
