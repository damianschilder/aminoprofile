<template lang="pug">
.component-wrapper
  .element-wrapper
    .element-body
      h1#search-heading Search for foods
      form.search(
        role="search"
        aria-labelledby="search-heading"
        :class="{ 'searchable': searchQuery.length > 0 }"
        @submit.prevent="searchFoods()"
      )
        label.visually-hidden(for="food-search") Food name
        input#food-search(
          ref="input"
          v-model="searchQuery"
          placeholder="Name..."
          maxlength="100"
          autocomplete="off"
          enterkeyhint="search"
        )
        //- Spinner and hidden button only show when an answer takes longer than 150 ms (see the
        //- styles), so a cached answer does not make the icon flash.
        UiLoader.loading( v-if="foodsStore.loading" aria-hidden="true")
        //- The button stays while a search runs, so keyboard focus is not lost; the spinner covers it.
        button.search-button.bare-button(type="submit" aria-label="Search" :class="{ 'busy': foodsStore.loading }")
          nuxt-icon(name="search" aria-hidden="true")
      //- Only shown when JavaScript is off (by the noscript style below), when searching would
      //- just reload the page.
      .needs-js(hidden) Search needs JavaScript.
      //- While a new search is slow, the previous message keeps its place (so nothing below jumps)
      //- but is no longer shown.
      .error( v-if="foodsStore.error" :class="{ 'stale': slowLoading }")
        span {{ errorText }}
        button.retry.bare-button(v-if="showRetry" type="button" @click="retry") Try again
      .error( v-else-if="noResults" :class="{ 'stale': slowLoading }") No foods found for "{{ foodsStore.searchQuery }}".
      .results( v-if="showResults" role="table" aria-label="Search results" :aria-busy="foodsStore.loading ? 'true' : 'false'")
        .headers(role="row")
          span(role="columnheader") Name
          span(role="columnheader") Category
          .nutrients(role="columnheader")
            span Nutrients
            button.info-button.bare-button(
              type="button"
              aria-label="About the nutrients column"
              aria-describedby="nutrients-info"
              :aria-expanded="hover ? 'true' : 'false'"
              @mouseenter="hover = true"
              @mouseleave="hover = false"
              @focus="hover = true"
              @blur="hover = false"
              @click="hover = !hover"
              @keydown.esc="hover = false"
            )
              nuxt-icon( name="info" aria-hidden="true")
            .info#nutrients-info( :class="{'show' : hover}" role="tooltip")
              .row
                span #
                span Number of nutrients available.
              .row
                nuxt-icon.lacking(name="minerals" aria-hidden="true")
                span Amino acids data not present.
              .row
                nuxt-icon.present(name="minerals" aria-hidden="true")
                span Amino acids data present.
        .result(
          v-for="food in foodsStore.results"
          :key="food.fdcId"
          role="row"
          :class="{ 'clickable': hasAminoAcids(food.values), 'added': foodsStore.isShown(food.fdcId) }"
          @click="hasAminoAcids(food.values) ? addFood(food) : null"
        )
          span(role="cell")
            span.name(
              v-if="hasAminoAcids(food.values)"
              role="button"
              tabindex="0"
              :aria-label="foodsStore.isShown(food.fdcId) ? `${food.description} is in the amino acids table` : `Add ${food.description} to the amino acids table`"
              @keydown.enter.prevent="addFood(food)"
              @keydown.space.prevent="addFood(food)"
            ) {{ food.description }}
            template(v-else) {{ food.description }}
          span(role="cell") {{ food.category }}
          .nutrients(role="cell" :class="{ 'acids': hasAminoAcids(food.values) }")
            span {{ food.nutrientCount }}
            //- nuxt-icon(name="acids")
            nuxt-icon(name="minerals" aria-hidden="true")
            span.visually-hidden {{ hasAminoAcids(food.values) ? 'Amino acids data present.' : 'Amino acids data not present.' }}
      .total( v-if="showResults")
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
import { hasAminoAcids, type FoodResult } from '#shared/nutrients';

const foodsStore = useFoodsStore();

// Browsers with JavaScript off apply this style and show the note that search needs it.
useHead({ noscript: [{ innerHTML: '<style>.needs-js { display: block }</style>' }] });

const searchQuery = ref<string>('');

const input = ref<HTMLInputElement | null>(null);

const hover = ref<boolean>(false);

// The last food added, for screen readers; cleared by the next search.
const added = ref<string>('');

// "Searching…" is only announced when an answer takes longer than the spinner's 150 ms.
const slow = ref<boolean>(false);
let slowTimer: ReturnType<typeof setTimeout> | undefined;
watch(() => foodsStore.loading, (loading) => {
  clearTimeout(slowTimer);
  slow.value = false;
  if (loading) slowTimer = setTimeout(() => { slow.value = true; }, 150);
});
onBeforeUnmount(() => clearTimeout(slowTimer));
const slowLoading = computed(() => foodsStore.loading && slow.value);

/** "10 minutes", from the Retry-After the server sent with "too many searches". */
function waitText(seconds: number) {
  if (seconds <= 60) return 'a minute';
  if (seconds >= 3600) return 'an hour';
  return `${Math.ceil(seconds / 60)} minutes`;
}

const errorText = computed(() => {
  switch (foodsStore.errorReason) {
    case 'too-short': return 'Type at least 2 characters.';
    case 'busy': return foodsStore.canRetry || !foodsStore.retryAfter
      ? 'Too many searches right now.'
      : `Too many searches right now. Please try again in ${waitText(foodsStore.retryAfter)}.`;
    case 'offline': return 'No internet connection.';
    case 'unavailable': return "Can't connect to the food database right now.";
    default: return '';
  }
});

const showRetry = computed(() => foodsStore.canRetry && !foodsStore.loading && foodsStore.errorReason !== 'too-short');

// The button disappears once the answer is in, so keyboard focus goes back to the search field.
function retry() {
  input.value?.focus();
  added.value = '';
  foodsStore.retrySearch();
}

const showResults = computed(() => !foodsStore.error && foodsStore.results.length > 0);

const noResults = computed(() => foodsStore.status === 'done' && foodsStore.results.length === 0);

const countText = computed(() => {
  const shown = foodsStore.results.length;
  const total = foodsStore.responseHits ?? shown;
  if (total > shown) return `${shown} of ${total.toLocaleString('en-US')} results`;
  return `${shown} ${shown === 1 ? 'result' : 'results'}`;
});

const announcement = computed(() => {
  if (slowLoading.value) return 'Searching…';
  if (foodsStore.error) return errorText.value;
  if (noResults.value) return `No foods found for "${foodsStore.searchQuery}".`;
  if (foodsStore.status === 'done') return added.value || `${countText.value} for "${foodsStore.searchQuery}".`;
  return '';
});

// The snackbar's text; it hides itself after 4 seconds, or at the next search.
const snackbar = ref<string>('');
let snackbarTimer: ReturnType<typeof setTimeout> | undefined;
function showSnackbar(text: string) {
  snackbar.value = text;
  clearTimeout(snackbarTimer);
  snackbarTimer = setTimeout(() => { snackbar.value = ''; }, 4000);
}
onBeforeUnmount(() => clearTimeout(snackbarTimer));

function searchFoods() {
  added.value = '';
  snackbar.value = '';
  foodsStore.searchFoods(searchQuery.value);
}

function addFood(food: FoodResult) {
  const wasShown = foodsStore.isShown(food.fdcId);
  if (!foodsStore.addFood(food)) return;
  added.value = `${food.description} is in the amino acids table.`;
  showSnackbar(wasShown ? `${food.description} is already in the table.` : `${food.description} added to the table.`);
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
    &:focus {
      border-bottom: 2px solid $colors--primary;
      margin-bottom: 15px;
    }
  }
  > .search-button {
    position: absolute;
    right: 0;
    top: 0;
    &.busy {
      opacity: 0;
      // Hidden only when the answer takes longer than 150 ms; shown again at once.
      transition: opacity 0s linear 150ms;
    }
  }
  > .search-button:deep(.nuxt-icon svg) {
    display: block;
    height: fit-content;
    margin-bottom: 0;
    width: 1.8rem;
    color: $neutral-variant50;
  }
  > .loading {
    position: absolute;
    top: 3px;
    right: 6px;
    animation: show-after-150ms 0s linear 150ms backwards;
  }
}

@keyframes show-after-150ms {
  from { visibility: hidden; }
}

.error.stale {
  visibility: hidden;
}

.error > .retry {
  display: inline;
  margin-left: 0.5rem;
  color: $colors--primary;
  text-decoration: underline;
  cursor: pointer;
  &:hover {
    color: $primary20;
  }
}

.searchable > .search-button {
  &:deep(.nuxt-icon svg) {
    cursor: pointer;
    color: black;
  }
}


.results {
  width: 80%;
  > .error {
    font-size: 24px;
  }
  > .headers {
    display: grid;
    grid-template-columns: 400px max-content auto;
    column-gap: 2rem;
    font-size: 14px;
    /* font-weight: bold; */
    padding: 0 0.5rem;
    color: $neutral-variant30;
    margin-bottom: 1rem;
    > .nutrients {
      display: flex;
      justify-content: flex-end;
      position: relative;
      column-gap: 0.25rem;
      &:deep(.nuxt-icon svg) {
        height: fit-content;
        width: 1.2rem;
        &:hover {
          color: black;
        }
      }
      > .info {
        padding: 1rem;
        border-radius: 5px;
        top: 24px;
        right: 8px;
        position: absolute;
        visibility: hidden;
        opacity: 0;
        display: flex;
        flex-direction: column;
        row-gap: 0.5rem;
        width: max-content;
        background-color: white;
        filter: drop-shadow(0px 2px 2px rgba(0, 0, 0, 0.15));
        transition: visibility 0.2s, opacity 0.2s;
        > .row {
          display: grid;
          grid-template-columns: 19.2px auto;
          column-gap: 0.5rem;
          align-items: center;
          > span:first-child {
            justify-self: center;
          }
        }
        &:deep(.lacking.nuxt-icon svg) {
          color: $neutral-variant80;
        }
        &:deep(.present.nuxt-icon svg) {
          color: green;
        }
      }
      > .show {
        visibility: initial;
        opacity: 1;
      }
    }
  }
  > .result {
    display: grid;
    grid-template-columns: 400px max-content auto;
    column-gap: 2rem;
    padding: 0.3rem 0.5rem;
    border-radius: 5px;
    text-decoration: none;
    color: $neutral-variant80;
    .nutrients {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      // On the first line, like the name and the category, also when the name takes two lines.
      align-self: start;
      column-gap: 0.75rem;
      &:deep(.nuxt-icon svg) {
        height: fit-content;
        width: 1.5rem;
        color: $neutral-variant80;
      }
      > span:not(.visually-hidden) {
        text-align: right;
        width: 28.8px;
      }
    }
    .acids {
      &:deep(.nuxt-icon svg) {
        color: green;
      }

    }
  }
  > .clickable {
    color: $neutral-variant20;
    cursor: pointer;
    &:hover {
      background-color: $surfaces--light--surface2;
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
