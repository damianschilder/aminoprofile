<template lang="pug">
.component-wrapper 
  .element-wrapper
    .element-body 
      h2 Selected foods
      .table
        .header
          span  Name 
          .acids
            span  Lysine 
            span  Tryptothan 
            span  Threonine 
            span  Leucine 
            span  Histidine 
            span  Isoleucine 
            span  Valine 
            span  Phenylalanine 
            span  Methionine
        .content
          .none-selected( v-if="foodsStore.shownFoods.length === 0")
            span Search and add foods to compare
          .row( v-else v-for="food, index in foodsStore.shownFoods" :class="{ 'active': foodsStore.selectedFoods.includes(food.fdcId) }")
            .icons
              //- nuxt-icon(name="favorite/favorite")
              nuxt-icon.delete(name="delete" @click="deleteFood(index)")
              nuxt-icon.checkbox(:name="foodsStore.selectedFoods.includes(food.fdcId) ? 'checkbox/checkbox checked' : 'checkbox/checkbox empty'" @click="toggleFood(food.fdcId)")
            span.name {{ food.description }}
            .acids
              span {{  findValue(food.foodNutrients, 1214) }}
              span {{  findValue(food.foodNutrients, 1210) }}
              span {{  findValue(food.foodNutrients, 1211) }}
              span {{  findValue(food.foodNutrients, 1213) }}
              span {{  findValue(food.foodNutrients, 1221) }}
              span {{  findValue(food.foodNutrients, 1212) }}
              span {{  findValue(food.foodNutrients, 1219) }}
              span {{  findValue(food.foodNutrients, 1221) }}
              span {{  findValue(food.foodNutrients, 1215) }}
          .total( v-if="foodsStore.shownFoods.length > 1")
            .empty 
            span Total
            .acids
              span {{  findValue(selectedFoodsValues, 1214) }}
              span {{  findValue(selectedFoodsValues, 1210) }}
              span {{  findValue(selectedFoodsValues, 1211) }}
              span {{  findValue(selectedFoodsValues, 1213) }}
              span {{  findValue(selectedFoodsValues, 1221) }}
              span {{  findValue(selectedFoodsValues, 1212) }}
              span {{  findValue(selectedFoodsValues, 1219) }}
              span {{  findValue(selectedFoodsValues, 1221) }}
              span {{  findValue(selectedFoodsValues, 1215) }}
      .disclaimer
        span All values in grams per 100g.
        
</template>

<script setup lang="ts">
const foodsStore = useFoodsStore();
import findValue from '~/composables/findValue';

function toggleFood(fdcId: Food['fdcId']) {
  const index = foodsStore.selectedFoods.indexOf(fdcId);

  if (index !== -1) {
    foodsStore.selectedFoods.splice(index, 1);
  } else {
    foodsStore.selectedFoods.push(fdcId);
  }
}

function deleteFood(index: number) {
  foodsStore.shownFoods.splice(index, 1)
  foodsStore.selectedFoods.splice(index, 1)
}
const selectedFoodsValues = computed(() => {
  const mergedFoodNutrients = foodsStore.shownFoods
  .filter((food: Food) => foodsStore.selectedFoods.includes(food.fdcId))
  .map(food => food.foodNutrients)
  .flat()
  .reduce((merged, nutrient) => {
    const existingNutrient = merged.find((item: FoodNutrient) => item.nutrientId === nutrient.nutrientId);
    if (existingNutrient) {
      existingNutrient.value += nutrient.value;
    } else {
      merged.push({ ...nutrient });
    }
    return merged;
  }, []);
  return mergedFoodNutrients;
})
</script>

<style lang="scss" scoped>
.component-wrapper {
  background-color: rgba(61, 103, 79, 0.05);
  padding: 4rem 0 3rem;
}

h2 {
  margin-bottom: 2rem;
}

.table {
  > .header {
    display: flex;
    justify-content: space-between;
    column-gap: 0.5rem;
    margin-bottom: 1rem;
    // margin-left: 142px;
    margin-left: 75px;
    padding-right: 2rem;
    > .acids {
      display: flex;
      column-gap: 1rem;
    }
  }
  > .content {
    display: flex;
    flex-direction: column;
    background-color: white;
    filter: drop-shadow(0px 2px 2px rgba(0, 0, 0, 0.15));
    padding: 22px 32px 28px;
    border-radius: 16px;
    > .none-selected {
      display: flex;
      justify-content: center;
      color: $neutral-variant50;
    }
    > .row {
      display: grid;
      grid-template-columns: min-content auto 754.733px;
      align-items: center;
      column-gap: 1rem;
      line-height: 1.3rem;
      height: 41.6px;
      color: $neutral-variant80;
      > .icons {
        display: flex;
        column-gap: 0.4rem;
        justify-content: space-between;
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
        > .checkbox {
          &:hover {
            color: red;
          }
        }
      }
      > span {
        color: $neutral-variant60;
      }
      > .name {
        color: $neutral-variant70
      }
      > .acids {
        display: grid;
        grid-template-columns: 46.2px 81.2667px 73.85px 56.3666px 64.7833px 72.75px 45.5333px 104.367px 81.6167px;
        column-gap: 1rem;
      }
    }
    > .active {
      color: $neutral-variant20;
      > .name {
        color: $light--on-surface-variant;
      }
    }
    > .total {
      display: grid;
      grid-template-columns: 27.2px auto 754.733px;
      margin-top: 0.5rem;
      padding-top: 0.5rem;
      column-gap: 1rem;
      border-top: 1px solid $neutral-variant90;
      padding-left: 2.2rem;
      > .acids {
        display: grid;
        grid-template-columns: 46.2px 81.2667px 73.85px 56.3666px 64.7833px 72.75px 45.5333px 104.367px 81.6167px;
        column-gap: 1rem;
      }
    }
  }
}

.disclaimer {
  margin-top: 0.5rem;
  display: flex;
  justify-content: flex-end;
  font-size: 13px;
  > span {
    color: $neutral-variant70;
  }
}
</style>