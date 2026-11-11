<template lang="pug">
.component-wrapper
  .element-wrapper
    .element-body
      h1#search-heading Search for foods
      //- The search runs in the browser over Aminoprofile's own dataset (stores/foods.ts), so the
      //- results follow what is typed and nothing is sent anywhere.
      form.search(
        role="search"
        aria-labelledby="search-heading"
        :class="{ 'searchable': query.length > 0 }"
        @submit.prevent
      )
        label.visually-hidden(for="food-search") Food name
        input#food-search(
          ref="input"
          v-model="query"
          :placeholder="`${FOOD_COUNT} foods, e.g. lentils or kip`"
          maxlength="100"
          autocomplete="off"
          enterkeyhint="search"
          aria-describedby="search-status"
        )
        nuxt-icon.search-icon(name="search" aria-hidden="true")
      //- Only shown when JavaScript is off (by the noscript style below).
      .needs-js(hidden) Search needs JavaScript. All foods are also listed on #[a(href="/foods") the Foods page].
      .error(v-if="noResults")
        | No foods found for "{{ query.trim() }}".
        a.missing(:href="missingHref") Missing a food? Tell us
      .results(v-if="foodsStore.results.length" role="table" aria-label="Search results")
        .headers(role="row")
          span(role="columnheader") Name
          span(role="columnheader") Group
          span.num(role="columnheader") Protein, g per 100 g
          span.num(role="columnheader") Score
          span(role="columnheader")
            span.visually-hidden Food page
        .result(
          v-for="food in foodsStore.results"
          :key="food.id"
          role="row"
          :class="{ 'added': foodsStore.isShown(food.id) }"
          @click="addFood(food)"
        )
          span(role="cell")
            span.name(
              role="button"
              tabindex="0"
              :aria-label="foodsStore.isShown(food.id) ? `${food.name} is in the amino acids table` : `Add ${food.name} to the amino acids table`"
              @keydown.enter.prevent="addFood(food)"
              @keydown.space.prevent="addFood(food)"
            ) {{ food.name }}
          span(role="cell") {{ food.category }}
          span.num(role="cell") {{ food.values.protein === null ? '—' : food.values.protein.toFixed(1) }}
          span.num(role="cell") {{ food.score === null ? '—' : `${food.score}%` }}
          span(role="cell")
            NuxtLink.page(:to="`/foods/${food.id}`" :aria-label="`${food.name}: food page`" @click.stop) Details
      .total(v-if="foodsStore.results.length")
        span {{ countText }}
      p#search-status.visually-hidden(role="status") {{ announcement }}
      //- Material snackbar after a click on a result: what happened, and a way to the table, which
      //- is usually below the fold. Screen readers hear it through the status line above.
      Transition(name="snackbar")
        .snackbar(v-if="snackbar")
          span.text {{ snackbar }}
          button.action.bare-button(type="button" @click="viewTable") View
</template>

<script setup lang="ts">
import { FOOD_COUNT, type FoodResult } from '~/stores/foods';

const foodsStore = useFoodsStore();

// Browsers with JavaScript off apply this style and show the note that search needs it.
useHead({ noscript: [{ innerHTML: '<style>.needs-js { display: block }</style>' }] });

const input = ref<HTMLInputElement | null>(null);

const query = computed({
  get: () => foodsStore.searchQuery,
  set: (value: string) => {
    added.value = '';
    foodsStore.search(value);
  },
});

// The last food added, for screen readers; cleared by the next search.
const added = ref<string>('');

const noResults = computed(() => foodsStore.searched && foodsStore.results.length === 0);

const countText = computed(() => {
  const count = foodsStore.results.length;
  return `${count} ${count === 1 ? 'food' : 'foods'}`;
});

const missingHref = computed(() => `mailto:parels.app@gmail.com?subject=${encodeURIComponent(`Missing food: ${query.value.trim()}`)}`);

// Screen readers hear the count once typing pauses, not after every letter.
const announcement = ref('');
let announceTimer: ReturnType<typeof setTimeout> | undefined;
watch(() => [foodsStore.results.length, foodsStore.searched, added.value] as const, () => {
  clearTimeout(announceTimer);
  announceTimer = setTimeout(() => {
    if (added.value) announcement.value = added.value;
    else if (noResults.value) announcement.value = `No foods found for "${query.value.trim()}".`;
    else if (foodsStore.searched) announcement.value = `${countText.value} for "${query.value.trim()}".`;
    else announcement.value = '';
  }, 500);
});

// The snackbar's text; it hides itself after 4 seconds, or at the next search.
const snackbar = ref<string>('');
let snackbarTimer: ReturnType<typeof setTimeout> | undefined;
function showSnackbar(text: string) {
  snackbar.value = text;
  clearTimeout(snackbarTimer);
  snackbarTimer = setTimeout(() => { snackbar.value = ''; }, 4000);
}
onBeforeUnmount(() => {
  clearTimeout(snackbarTimer);
  clearTimeout(announceTimer);
});

function addFood(food: FoodResult) {
  const wasShown = foodsStore.isShown(food.id);
  if (!foodsStore.addFood(food.id)) return;
  added.value = `${food.name} is in the amino acids table.`;
  showSnackbar(wasShown ? `${food.name} is already in the table.` : `${food.name} added to the table.`);
}

// "View" scrolls to the table and puts keyboard focus on its heading.
function viewTable() {
  snackbar.value = '';
  const heading = document.getElementById('amino-heading');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  heading?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  heading?.focus({ preventScroll: true });
}
</script>

<style lang="scss" scoped>
.element-body {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.search {
  position: relative;
  margin: 1rem;
  > input {
    border-bottom: 1px solid $colors--primary;
    width: 30rem;
    margin-bottom: 1rem;
    padding-right: 2.25rem;
    &:focus {
      border-bottom: 2px solid $colors--primary;
      margin-bottom: 15px;
    }
  }
  > .search-icon {
    position: absolute;
    right: 0;
    top: 0;
    pointer-events: none;
    &:deep(svg) {
      display: block;
      height: fit-content;
      margin-bottom: 0;
      width: 1.8rem;
      color: $neutral-variant50;
    }
  }
}

.searchable > .search-icon:deep(svg) {
  color: black;
}

.error > .missing {
  margin-left: 0.5rem;
  color: $colors--primary;
}

.needs-js > a {
  color: $colors--primary;
}

.results {
  width: 80%;
  > .headers, > .result {
    display: grid;
    grid-template-columns: minmax(0, 400px) max-content 9rem 4rem max-content;
    column-gap: 2rem;
    padding: 0.3rem 0.5rem;
    > .num {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
  }
  > .headers {
    font-size: 14px;
    color: $neutral-variant30;
    margin-bottom: 0.5rem;
  }
  > .result {
    border-radius: 5px;
    color: $neutral-variant20;
    cursor: pointer;
    &:hover {
      background-color: $surfaces--light--surface2;
    }
    .page {
      color: $colors--primary;
      font-size: 14px;
    }
  }
  // A food that is in the amino acids table keeps the hover shade, so a click visibly did
  // something even when the table is below the fold.
  > .added {
    background-color: $surfaces--light--surface2;
  }
}
.total {
  width: 80%;
  padding-left: 1rem;
  font-size: 13px;
  > span {
    color: $neutral-variant10;
  }
}

// Material 3 snackbar: inverse surface, a text of at most two lines and one text button.
.snackbar {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  align-items: center;
  column-gap: 8px;
  min-height: 48px;
  max-width: 560px;
  padding: 0 8px 0 16px;
  border-radius: 4px;
  background-color: $light--inverse-surface;
  color: $light--inverse-on-surface;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3), 0 4px 8px 3px rgba(0, 0, 0, 0.15);
  font: 400 14px/20px $mulish;
  letter-spacing: 0.25px;
  > .text {
    margin: 14px 0;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  > .action {
    flex: none;
    padding: 10px 12px;
    border-radius: 20px;
    color: $light--inverse-primary;
    font: 500 14px/20px $mulish;
    letter-spacing: 0.1px;
    cursor: pointer;
    &:hover {
      background-color: rgba(163, 209, 180, 0.08);
    }
    &:focus-visible {
      outline: 2px solid $light--inverse-primary;
      outline-offset: 0;
    }
  }
}

.snackbar-enter-active,
.snackbar-leave-active {
  transition: opacity 150ms ease-out, transform 150ms ease-out;
}
.snackbar-enter-from,
.snackbar-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px);
}

@media (prefers-reduced-motion: reduce) {
  .snackbar-enter-active,
  .snackbar-leave-active {
    transition: none;
  }
}
</style>
