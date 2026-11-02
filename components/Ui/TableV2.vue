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
            //- Hovering an abbreviation shows the full name in a tooltip (.tip below).
            th.amino(
              v-for="nutrient in NUTRIENTS"
              :key="nutrient.key"
              scope="col"
              :aria-label="nutrient.name"
              :class="{ 'tip': nutrient.name !== nutrient.label }"
              :data-tip="nutrient.name !== nutrient.label ? nutrient.name : undefined"
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
            //- A value USDA does not have is a dash, as in Material data tables; the tooltip says why.
            td.amino(
              v-for="nutrient in NUTRIENTS"
              :key="nutrient.key"
              :class="{ 'tip': valueFor(food, nutrient.key) === null }"
              :data-tip="valueFor(food, nutrient.key) === null ? `No ${nutrient.name.toLowerCase()} data in FoodData Central` : undefined"
            )
              template(v-if="valueFor(food, nutrient.key) === null")
                span.no-data(aria-hidden="true") —
                span.visually-hidden No data
              template(v-else) {{ formatGrams(valueFor(food, nutrient.key)) }}
          tr.total
            td
            td Total #[span (g)]
            td.amino.above(
              v-for="nutrient in NUTRIENTS"
              :key="nutrient.key"
              :class="{ 'tip': !!totalNote(nutrient.key, nutrient.name) }"
              :data-tip="totalNote(nutrient.key, nutrient.name)"
            )
              template(v-if="foodsStore.totals[nutrient.key].value === null")
                span.no-data(aria-hidden="true") —
                span.visually-hidden No data
              template(v-else) {{ totalText(nutrient.key) }}

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
  return `${total.complete ? '' : '≥ '}${formatGrams(total.value)}`;
}

/** The tooltip of a total that is empty or incomplete. */
function totalNote(key: NutrientKey, name: string) {
  const total = foodsStore.totals[key];
  if (total.value === null) {
    return foodsStore.selectedFoods.length === 0
      ? 'Tick a food to add it to the total.'
      : `No ticked food has ${name.toLowerCase()} data.`;
  }
  if (!total.complete) return `Not every ticked food has ${name.toLowerCase()} data, so the total is at least this much.`;
  return undefined;
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

// Material 3 plain tooltip, on hover: the full name of an amino acid, or why a cell is empty.
// Below the cell, above it in the Total row, and right-aligned in the last column so it stays on
// the page. Not rendered at all until hovered, so it never widens the page.
.tip {
  position: relative;
  &::after {
    content: attr(data-tip);
    content: attr(data-tip) / ''; // screen readers have the name or "No data" already
    display: none;
    position: absolute;
    left: 50%;
    top: calc(100% - 2px);
    transform: translateX(-50%);
    z-index: 2;
    padding: 4px 8px;
    border-radius: 4px;
    background-color: $light--inverse-surface;
    color: $light--inverse-on-surface;
    font: 400 12px/16px $mulish;
    letter-spacing: 0.4px;
    white-space: nowrap;
    pointer-events: none;
  }
  &:hover::after {
    display: block;
    animation: tip-in 150ms ease-out 300ms backwards;
  }
  &.above::after {
    top: auto;
    bottom: calc(100% - 2px);
  }
  &:last-child::after {
    left: auto;
    right: 0;
    transform: none;
  }
}

@keyframes tip-in {
  from { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .tip:hover::after {
    animation: none;
  }
}


</style>
