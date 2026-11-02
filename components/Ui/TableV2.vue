<template lang="pug">
.component-wrapper
  .element-wrapper
    .element-body
      h2#amino-heading(ref="heading" tabindex="-1") Essential amino acids
      table(ref="table" aria-labelledby="amino-heading")
        thead
          tr
            th(scope="col")
              span.visually-hidden Amount
            th(scope="col") Name
            th.amino(
              v-for="nutrient in NUTRIENTS"
              :key="nutrient.key"
              scope="col"
              :aria-label="nutrient.name"
              :title="nutrient.name !== nutrient.label ? nutrient.name : undefined"
            ) {{ nutrient.label }}
        tbody
          tr.row(
            v-for="(food, index) in foodsStore.shownFoods"
            :key="food.fdcId"
            :class="{ 'active': foodsStore.isSelected(food.fdcId) }"
            @click="toggleRow($event, food.fdcId)"
          )
            td
              .actions
                button.remove.bare-button(
                  type="button"
                  :aria-label="`Remove ${food.description}`"
                  @click="removeFood(food.fdcId, index)"
                )
                  nuxt-icon.delete(name="delete" aria-hidden="true")
                button.bare-button(
                  type="button"
                  role="checkbox"
                  :aria-checked="foodsStore.isSelected(food.fdcId) ? 'true' : 'false'"
                  :aria-label="`Include ${food.description} in the total`"
                  @click="foodsStore.toggleFood(food.fdcId)"
                )
                  nuxt-icon.checkbox(:name="foodsStore.isSelected(food.fdcId) ? 'checkbox/checkbox checked' : 'checkbox/checkbox empty'" aria-hidden="true")
                .amount
                  input(
                    :value="food.amount"
                    maxlength="3"
                    inputmode="decimal"
                    autocomplete="off"
                    placeholder="100"
                    :aria-label="`Amount of ${food.description} in grams`"
                    @input="updateAmount($event, food.fdcId)"
                  )
                  span(aria-hidden="true") g
            td.name {{food.description}}
            td.amino(v-for="nutrient in NUTRIENTS" :key="nutrient.key") {{ formatGrams(valueFor(food, nutrient.key)) }}
          tr.total
            td
            td Total #[span (g)]
            td.amino(
              v-for="nutrient in NUTRIENTS"
              :key="nutrient.key"
              :title="incompleteNote(nutrient.key, nutrient.name)"
            ) {{ totalText(nutrient.key) }}

</template>

<script setup lang="ts">
import { NUTRIENTS, formatGrams, type NutrientKey } from '#shared/nutrients';

const foodsStore = useFoodsStore();

const heading = ref<HTMLElement | null>(null);
const table = ref<HTMLTableElement | null>(null);

// A click on the row (not on its buttons or amount field) ticks or unticks the food, unless the
// click ended a text selection.
function toggleRow(event: MouseEvent, fdcId: number) {
  if ((event.target as Element | null)?.closest('button, input')) return;
  if (window.getSelection()?.toString()) return;
  foodsStore.toggleFood(fdcId);
}

// After a removal, keyboard focus goes to the next food's remove button (or the heading when the
// table is empty), instead of being lost.
async function removeFood(fdcId: number, index: number) {
  foodsStore.removeFood(fdcId);
  await nextTick();
  const buttons = table.value?.querySelectorAll<HTMLButtonElement>('button.remove') ?? [];
  const next = buttons[Math.min(index, buttons.length - 1)];
  (next ?? heading.value)?.focus();
}

// Whole grams or one decimal, up to 3 characters: "100", "50", "2.5". Empty means 100 g.
function updateAmount(event: Event, fdcId: number) {
  const input = event.target as HTMLInputElement;
  const clean = input.value.replace(',', '.').replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
  if (clean !== input.value) input.value = clean;
  foodsStore.setAmount(fdcId, clean);
}

function totalText(key: NutrientKey) {
  const total = foodsStore.totals[key];
  if (total.value === null) return 'N/a';
  return `${total.complete ? '' : '≥ '}${formatGrams(total.value)}`;
}

function incompleteNote(key: NutrientKey, name: string) {
  const total = foodsStore.totals[key];
  if (total.value === null || total.complete) return undefined;
  return `Not every ticked food has ${name.toLowerCase()} data, so the total is at least this much.`;
}
</script>

<style lang="scss" scoped>
.component-wrapper {
  background-color: rgba(61, 103, 79, 0.05);
  padding: 4rem 0 3rem;
}

h2 {
  margin-bottom: 2rem;
  &:focus {
    outline: none;
  }
}

table {
  width: 100%;
  text-align: left;
  border-collapse: collapse;
  tbody {
    tr {
      position: relative;
      align-items: center;
      align-content: center;
      line-height: 1.3rem;
      height: 41.6px;
      .info {
        position: absolute;
      }
    }
    .row {
      // A click on the row ticks or unticks the food.
      cursor: pointer;
      color: $neutral-variant80;
      input {
        color: $neutral-variant80;
      }
      span {
        color: $neutral-variant80;
      }
    }
    .active {
      color: $neutral-variant20;
      > .name {
        color: $light--on-surface-variant;
      }
      input {
        color: $neutral-variant10;
      }
      span {
        color: $neutral-variant50-text;
      }
    }
  }
  .total {
    margin-top: 1rem;
    border-top: 1px solid $neutral-variant90;
    span {
      color: $neutral-variant50-text;
    }
  }
  .amino {
    white-space: nowrap;
    padding: 0.5rem 1.2rem;
    span {
      color: $neutral-variant50-text;
      margin-left: 0.1rem;
    }
  }
  .actions {
    display: flex;
    column-gap: 0.5rem;
    align-items: center;
    margin-right: 1.5rem;
    &:deep(.nuxt-icon svg) {
      cursor: pointer;
      height: fit-content;
      width: 1.7rem;
      color: $neutral-variant60;
    }
    &:deep(.delete.nuxt-icon svg) {
      &:hover {
        color: red;
      }
    }
    &:deep(.checkbox.nuxt-icon svg) {
      &:hover {
        color: black;
      }
    }
    .amount {
      display: flex;
      column-gap: 0.1rem;
      align-items: flex-end;
      input {
        margin-left: 0.2rem;
        font-size: 1rem;
        border-bottom: 1px solid $colors--primary;
        width: 1.75rem; // Ensures the input starts with at least 2rem width
        line-height: 0.9rem;
        margin-bottom: 1px;
        &:focus {
          border-bottom: 2px solid $colors--primary;
          margin-bottom: 0px;
        }
        &::placeholder {
          color: $placeholder-text;
        }
      }
    }
  }
  .name {
    width: 100%; // Allow it to expand and fill remaining space
    word-wrap: break-word;
    // The same room above and below as the amounts, so a name that wraps to two lines does not
    // touch the next row. One-line rows keep their height (41.6px).
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
  }
}


</style>
