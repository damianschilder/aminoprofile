<template lang="pug">
.component-wrapper 
  .element-wrapper
    .element-body 
      h1 Search for foods
      .search( :class="{ 'searchable': searchQuery && searchQuery.length > 0 }" )
        input(placeholder="Name..." v-model="searchQuery" @keyup.enter="searchFoods()")
        UiLoader.loading( v-if="loading")
        nuxt-icon( v-else name="search"   @click="searchFoods()")
      .results( v-if="foodsStore && foodsStore.foods.length > 0" )
        .headers
          .empty
          span Name
          span Category
          .nutrients
            span Nutrients
            nuxt-icon( name="info" )
        .result( v-for="food in foodsStore.foods" @click="addFood(food)")
          span {{ food.description }}
          span {{ food.foodCategory }}
          .nutrients(:class="{ 'acids': findValue(food.foodNutrients, 1214) !== '' }")
            span {{ food.foodNutrients.length }}
            //- nuxt-icon(name="acids")
            nuxt-icon(name="minerals")
        .total 
          span {{ foodsStore.foods.length }} {{ foodsStore.foods.length === 1 ? 'result' : 'results'}}
  </template>

<script setup>
import { useFoodsStore } from '@/stores/foods'

const runtimeConfig = useRuntimeConfig()
const apiKey = runtimeConfig.public.foodDataKey

const foodsStore = useFoodsStore();

const searchQuery = ref('');

const loading = ref(false);

async function searchFoods() {
  loading.value = true;
  if (searchQuery) await foodsStore.searchFoods(searchQuery.value, apiKey);
  loading.value = false;
}

function addFood( food ) {
  foodsStore.selectedFoods.set(food.fdcId, food);
}

function findValue(foodNutrients, nutrientId) {
  const result = foodNutrients.find(nutrient => {
  return nutrient.nutrientId == nutrientId
  })
  if (result) return result.value
  return ''
}
</script>

<style lang="scss" scoped>
.element-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  /* justify-content: center; */
}
/* h1 {
  width: 30rem;
} */
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
  margin-bottom: 2rem;
  > .headers {
    display: grid;
    grid-template-columns: 200px 400px max-content auto;
    column-gap: 2rem;
    font-size: 14px;
    /* font-weight: bold; */
    padding: 0 0.5rem;
    color: $neutral-variant30;
    margin-bottom: 1rem;
    > .nutrients {
      display: flex;
      justify-content: end;
      column-gap: 0.25rem;
      &:deep(.nuxt-icon svg) {
        height: fit-content;
        width: 1.2rem;
        &:hover {
          color: black;
        }
      }
    }
  }
  > .result {
    cursor: pointer;
    display: grid;
    grid-template-columns: 400px max-content auto;
    column-gap: 2rem;
    padding: 0.3rem 0.5rem;
    border-radius: 5px;
    &:hover {
      background-color: $surfaces--light--surface2;
    }
    .nutrients {
      display: flex;
      justify-content: end;
      align-items: center;
      column-gap: 0.75rem;
      &:deep(.nuxt-icon svg) {
        height: fit-content;
        width: 1.5rem;
        color: $neutral-variant70;
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
  > .total {
    padding-left: 0.5rem;
    font-size: 13px;
    > span {
      color: $neutral-variant70;
    }
  }
}
</style>