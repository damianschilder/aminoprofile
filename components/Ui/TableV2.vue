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
          //- The quality of the protein of the ticked foods together (shared/scoring.ts): how many
          //- mg of each essential amino acid one gram of it holds, and below that how many the FAO
          //- (2013) pattern asks. Under the bar is red. Methionine counts with cystine and
          //- phenylalanine with tyrosine, as in the pattern. Under Protein: complete or not.
          tr.per-protein
            td
            td.tip.wide.start.above(:data-tip="PER_PROTEIN_EXPLAINED") Per g protein #[span (mg)]
            td.amino.wide.above(
              v-for="nutrient in NUTRIENTS"
              :key="nutrient.key"
              :class="{ 'tip': !!ratioNote(nutrient.key), 'short': isShort(nutrient.key), 'limiting': isLimiting(nutrient.key), 'complete': nutrient.key === 'protein' && verdict?.complete }"
              :data-tip="ratioNote(nutrient.key)"
            )
              template(v-if="ratioText(nutrient.key) === null")
                span.no-data(aria-hidden="true") —
                span.visually-hidden No value
              template(v-else)
                | {{ ratioText(nutrient.key) }}
                span.visually-hidden(v-if="isShort(nutrient.key)")  (below what is needed)
          tr.needed
            td
            td.tip.wide.start.above(:data-tip="NEEDED_EXPLAINED") Needed #[span (mg)]
            td.amino.wide.above(
              v-for="nutrient in NUTRIENTS"
              :key="nutrient.key"
              :class="{ 'tip': !!pairNote(nutrient.key) }"
              :data-tip="pairNote(nutrient.key)"
            ) {{ neededText(nutrient.key) }}
      //- What the two rows above add up to, and what to add when the protein falls short: the
      //- foods of Aminoprofile's dataset with the most of that amino acid per gram of protein.
      p.verdict(v-if="verdict" aria-live="polite")
        template(v-if="verdict.complete")
          strong.complete Complete protein.
          |  Every essential amino acid reaches what the FAO pattern asks per gram of protein. The lowest is {{ verdict.lowest }}.
        template(v-else)
          strong.short Short in {{ verdict.shortNames }}.
          |  Combine it with foods that have more {{ verdict.first.name }} per gram of protein, such as
          template(v-for="(food, i) in verdict.suggestions" :key="food.id")
            | {{ i === 0 ? ' ' : i === verdict.suggestions.length - 1 ? ' or ' : ', ' }}
            NuxtLink(:to="`/foods/${food.id}`") {{ food.name.toLowerCase() }}
            |  ({{ food.mgPerG }} mg)
          | .
</template>

<script setup lang="ts">
import { NUTRIENTS, formatGrams, type ColumnKey, type NutrientKey } from '#shared/nutrients';
import { SCORING_PATTERN, formatPercent, type ScoredKey } from '#shared/scoring';
import richestFoods from '#shared/richest-foods.json';

const PER_PROTEIN_EXPLAINED = 'How many milligrams of each essential amino acid one gram of the ticked foods\' protein holds, together. Red: less than needed, so combine it with other foods. Met includes cystine and Phe includes tyrosine, as in the pattern. Not corrected for digestibility.';
const NEEDED_EXPLAINED = 'What one gram of protein should hold, in milligrams, by the FAO (2013) pattern for ages 3 and up: enough protein then also gives enough of each essential amino acid.';

const SCORED_NAME = Object.fromEntries(SCORING_PATTERN.map(item => [item.key, item.name])) as Record<ScoredKey, string>;
const RICHEST = richestFoods.byKey as Record<ScoredKey, { id: string, name: string, mgPerG: number }[]>;

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

// The "Per g protein" and "Needed" rows, and the sentence under the table.

/** Whole milligrams, with one decimal below 10 (tryptophan: 6.6 is needed). */
const formatMg = (mg: number) => (mg < 10 ? mg.toFixed(1) : String(Math.round(mg)));

const isScored = (key: ColumnKey): key is ScoredKey => key !== 'protein';

/** Below the bar. A value that is only a lower bound (data missing) is not called short. */
function isShort(key: ColumnKey) {
  if (!isScored(key)) return verdict.value !== null && !verdict.value.complete;
  const score = foodsStore.scores.byKey[key];
  return score.percent !== null && score.percent < 100 && !score.atLeast;
}

/** The lowest one, in bold. */
function isLimiting(key: ColumnKey) {
  return isScored(key) && limitingKeys.value.includes(key);
}

/**
 * The lowest of the values that are certain. A lower bound (data missing) may really be higher,
 * so it is not called the limiting one: otherwise "≥ 3.5" would be bold while the sentence below
 * says another amino acid is short.
 */
const limitingKeys = computed<ScoredKey[]>(() => {
  const { byKey, overall } = foodsStore.scores;
  if (overall.percent === null) return [];
  const certain = SCORING_PATTERN.filter(item => !byKey[item.key].atLeast);
  if (certain.length === 0) return [];
  const lowest = Math.min(...certain.map(item => byKey[item.key].percent!));
  return certain.filter(item => byKey[item.key].percent === lowest).map(item => item.key);
});

function ratioText(key: ColumnKey): string | null {
  if (!isScored(key)) {
    if (!verdict.value) return null;
    return verdict.value.complete ? 'Complete' : 'Short';
  }
  const score = foodsStore.scores.byKey[key];
  return score.mgPerG === null ? null : `${score.atLeast ? '≥ ' : ''}${formatMg(score.mgPerG)}`;
}

function neededText(key: ColumnKey): string {
  return isScored(key) ? formatMg(foodsStore.scores.byKey[key].needed) : '';
}

/** Under Met and Phe: the bar is for the pair. */
function pairNote(key: ColumnKey): string | undefined {
  return key === 'met' || key === 'phe' ? `For ${SCORED_NAME[key]} together` : undefined;
}

/** The tooltip of a value: the numbers in words, or why there is none. */
function ratioNote(key: ColumnKey): string | undefined {
  const { byKey, overall, proteinKnown } = foodsStore.scores;
  if (foodsStore.selectedFoods.length === 0) return 'Tick a food to see its protein quality.';
  if (!proteinKnown) return 'Not every ticked food has protein data, so this cannot be worked out.';
  if (!isScored(key)) {
    if (!verdict.value) return 'This needs data for every essential amino acid.';
    // A lower bound when the lowest value misses data: "≥ 52%".
    const percent = formatPercent(overall.percent!, overall.atLeast);
    return verdict.value.complete
      ? `Every essential amino acid reaches what is needed. Amino acid score: ${percent}.`
      : `Below what is needed in ${verdict.value.shortNames}. Amino acid score: ${percent}.`;
  }
  const score = byKey[key];
  const name = SCORED_NAME[key];
  if (score.mgPerG === null) return `No ticked food has ${name} data.`;
  const text = `${name.charAt(0).toUpperCase()}${name.slice(1)}: ${formatMg(score.mgPerG)} mg per g protein, ${Math.round(score.percent!)}% of the ${formatMg(score.needed)} needed.`;
  return score.atLeast ? `${text} Not every ticked food has data for it, so it is at least this.` : text;
}

const listOf = (items: string[]) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`);

/**
 * Complete or short, for the Protein column and the sentence under the table. Null while there is
 * nothing to say: no ticked food, no protein data, or an amino acid without data.
 */
const verdict = computed(() => {
  const { byKey, overall, proteinKnown } = foodsStore.scores;
  if (foodsStore.selectedFoods.length === 0 || !proteinKnown || overall.percent === null) return null;
  const short = SCORING_PATTERN
    .filter(item => byKey[item.key].percent! < 100 && !byKey[item.key].atLeast)
    .sort((a, b) => byKey[a.key].percent! - byKey[b.key].percent!);
  if (short.length === 0) {
    // With a missing value the lowest is only a lower bound, so "complete" is not certain yet.
    if (overall.percent < 100) return null;
    return { complete: true as const, lowest: listOf(overall.limiting.map(k => SCORED_NAME[k])) };
  }
  const first = short[0]!;
  return {
    complete: false as const,
    shortNames: listOf(short.map(item => SCORED_NAME[item.key])),
    first: { key: first.key, name: SCORED_NAME[first.key] },
    suggestions: RICHEST[first.key] ?? [],
  };
});
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

.verdict {
  margin-top: 1.5rem;
  color: $neutral-variant30;
  > .complete {
    color: $colors--primary;
  }
  > .short {
    color: $error40;
  }
  a {
    color: $colors--primary;
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
  .per-protein, .needed {
    span {
      color: $neutral-variant50-text;
    }
  }
  .per-protein {
    // Below what is needed: combine with other foods. The lowest one in bold.
    .short {
      color: $error40;
    }
    .limiting {
      font-weight: 700;
    }
    .complete {
      color: $colors--primary;
      font-weight: 700;
    }
  }
  // The bar itself: quieter than the values above it.
  .needed {
    color: $neutral-variant50-text;
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
  // A longer explanation wraps, at the width of a Material rich tooltip.
  &.wide::after {
    white-space: normal;
    width: max-content;
    max-width: 18rem;
  }
  // Under a left-aligned label, starting where the label starts.
  &.start::after {
    left: 0;
    transform: none;
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
