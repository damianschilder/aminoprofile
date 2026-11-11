<template lang="pug">
//- The last line of an explanation: what it rests on, as author-year links to the list on /sources
//- (quiet-functionalism guides/sources.md). cite="fao-2013: Table 5 | eu-1169-2011: Annex I, point 10".
span.ui-source
  | {{ items.length > 1 ? 'Sources' : 'Source' }}:
  template(v-for="(item, i) in items" :key="item.id")
    | {{ i === 0 ? ' ' : ' · ' }}
    NuxtLink(v-if="item.ref" :to="referenceHref(item.id)") {{ item.ref.short }}
    template(v-else) {{ item.id }}
    template(v-if="item.at") , {{ item.at }}
</template>

<script setup lang="ts">
import { REFERENCE_BY_ID, parseCite, referenceHref } from '#shared/references';

const props = defineProps<{ cite: string }>();

const items = computed(() => parseCite(props.cite).map(c => ({ ...c, ref: REFERENCE_BY_ID.get(c.id) })));
</script>

<style lang="scss" scoped>
.ui-source {
  display: block;
  margin-top: 0.5rem;
  font-size: 13px;
  line-height: 18px;
  color: $neutral-variant50-text;
  a {
    color: inherit;
    text-decoration: underline;
    &:hover, &:focus-visible {
      color: black;
    }
  }
}
</style>
