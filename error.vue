<template lang="pug">
//- The page Nuxt shows for an unknown address or an error, in the style of the privacy page.
NuxtLayout(name="plain")
  .page-wrapper
    .element-wrapper
      .element-body
        .content
          UiBack
          h1 {{ heading }}
          p.intro {{ text }}
</template>

<script setup lang="ts">
import type { NuxtError } from '#app';

const props = defineProps<{ error: NuxtError }>();

const notFound = computed(() => props.error?.statusCode === 404);

const heading = computed(() => (notFound.value ? 'Page not found' : 'Something went wrong'));

const text = computed(() => (notFound.value
  ? 'This page does not exist. Go back to search for foods and compare their essential amino acids.'
  : 'Please try again later.'));

useHead({
  title: () => `${heading.value} - Aminoprofile`,
  meta: [{ name: 'robots', content: 'noindex' }],
});
</script>

<style lang="scss" scoped>
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
</style>
