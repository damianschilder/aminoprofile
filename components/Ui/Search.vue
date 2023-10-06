<template lang="pug">
.component-wrapper 
  .element-wrapper
    .element-body
      h1 Search for foods
      .search( :class="{ 'searchable': searchQuery && searchQuery.length > 0 }" )
        input(placeholder="Name..." v-model="searchQuery" @keyup.enter="searchFoods()")
        UiLoader.loading( v-if="loading")
        nuxt-icon( v-else name="search"   @click="searchFoods()")
      .error( v-if="foodsStore.error") Can't connect to databank. Please try again later.
      .results( v-if="foodsStore && !foodsStore.error && foodsStore.results.length > 0" )
        .headers
          span Name
          span Category
          .nutrients
            span Nutrients
            nuxt-icon( name="info" @mouseover="hover = true" @mouseleave="hover = false")
            .info( :class="{'show' : hover}")
              .row 
                span #
                span Number of nutrients available.
              .row 
                nuxt-icon.lacking(name="minerals")
                span Amino acids data not present.
              .row 
                nuxt-icon.present(name="minerals")
                span Amino acids data present.
        .result( v-for="food in sortedResults" @click="findValue(food.foodNutrients, 1214) !== 'N/a' ? addFood(food) : null" :class="{ 'clickable': findValue(food.foodNutrients, 1214) !== 'N/a' }")
          span(@click="addFood(food)") {{ food.description }}
          span {{ food.foodCategory }}
          .nutrients(:class="{ 'acids': findValue(food.foodNutrients, 1214) !== 'N/a' }")
            span {{ food.foodNutrients.length }}
            //- nuxt-icon(name="acids")
            nuxt-icon(name="minerals")
      .total( v-if="foodsStore.responseHits !== null") 
        span {{ foodsStore.results.length }} {{ foodsStore.results.length === 1 ? 'result' : 'results'}}
  </template>

<script setup lang="ts">
import findValue from '~/composables/findValue';

const foodsStore = useFoodsStore();
const runtimeConfig = useRuntimeConfig()
const apiKey: string = runtimeConfig.public.foodDataKey

const searchQuery = ref<string>('');

const loading = ref<Boolean>(false);

const hover = ref<Boolean>(false);

function sortByFindValue(foods: Food[]) {
  const sortedFoods = [...foods];
  sortedFoods.sort((a, b) => {
    const aValue = findValue(a.foodNutrients, 1214);
    const bValue = findValue(b.foodNutrients, 1214);
    if (typeof aValue === 'number' && typeof bValue !== 'number') {
      return -1;
    } else if (typeof aValue !== 'number' && typeof bValue === 'number') {
      return 1;
    } else {
      return 0;
    }
  });
  return sortedFoods;
}

const sortedResults = computed(() => {
  return sortByFindValue(foodsStore.results);
})

async function searchFoods() {
  loading.value = true;
  if (searchQuery) await foodsStore.searchFoods(searchQuery.value, apiKey);
  loading.value = false;
}

function addFood( food: Food ) {
  if (!foodsStore.shownFoods.includes(food)) {
    foodsStore.shownFoods.push(food);
    foodsStore.selectedFoods.push(food.fdcId)
  }
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
  >:deep(.nuxt-icon svg) {
    position: absolute;
    height: fit-content;
    margin-bottom: 0;
    width: 1.8rem;
    right: 0;
    color: $neutral-variant50;
    top: 0;
  }
  > .loading {
    position: absolute;
    top: 3px;
    right: 6px;
  }
}

.searchable {
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
      column-gap: 0.75rem;
      &:deep(.nuxt-icon svg) {
        height: fit-content;
        width: 1.5rem;
        color: $neutral-variant80;
      }
      > span {
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
}
.total {
  width: 80%;
  padding-left: 1rem;
  font-size: 13px;
  > span {
    color: $neutral-variant70;
  }
}
</style>~/types/FoodBankTypes