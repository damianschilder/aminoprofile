<template lang="pug">
  .component-wrapper 
    .element-wrapper
      .element-body 
        h2 Selected foods
        table
          thead
            tr
              th
              th Name
              th.amino His
              th.amino Ile
              th.amino Leu
              th.amino Lys
              th.amino Met
              th.amino Phe
              th.amino Thr
              th.amino Trp
              th.amino Val
          tbody
            tr(
              v-for="(food, index) in foodsStore.shownFoods" 
              :key="food.fdcId" 
              :class="{ 'active': foodsStore.selectedFoods.includes(food.fdcId) }" 
              @click="toggleRow(food.fdcId)"
            )
              td
                .actions
                  nuxt-icon.delete(name="delete" @click="deleteFood(index)")
                  nuxt-icon.checkbox(:name="foodsStore.selectedFoods.includes(food.fdcId) ? 'checkbox/checkbox checked' : 'checkbox/checkbox empty'" @click="toggleFood(food.fdcId)")
                  input.amount(v-model.number="food.amount" maxlength="3" @input="updateFoodValues(food)")
              td.name {{food.description}}
              td.amino {{ findValue(food.foodNutrients, 1219) }}
              td.amino {{ findValue(food.foodNutrients, 1212) }}
              td.amino {{ findValue(food.foodNutrients, 1213) }}
              td.amino {{ findValue(food.foodNutrients, 1214) }}
              td.amino {{ findValue(food.foodNutrients, 1215) }}
              td.amino {{ findValue(food.foodNutrients, 1221) }}
              td.amino {{ findValue(food.foodNutrients, 1211) }}
              td.amino {{ findValue(food.foodNutrients, 1210) }}
              td.amino {{ findValue(food.foodNutrients, 1221) }}
            tr.total
              td
              td Total
              td.amino {{  findValue(selectedFoodsValues, 1214) }}
              td.amino {{  findValue(selectedFoodsValues, 1210) }}
              td.amino {{  findValue(selectedFoodsValues, 1211) }}
              td.amino {{  findValue(selectedFoodsValues, 1213) }}
              td.amino {{  findValue(selectedFoodsValues, 1221) }}
              td.amino {{  findValue(selectedFoodsValues, 1212) }}
              td.amino {{  findValue(selectedFoodsValues, 1219) }}
              td.amino {{  findValue(selectedFoodsValues, 1221) }}
              td.amino {{  findValue(selectedFoodsValues, 1215) }}
  
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
  
  table {
    width: 100%;
    text-align: left;
    border-collapse: collapse;
    tbody {
      tr {
        align-items: center;
        align-content: center;
        line-height: 1.3rem;
        height: 41.6px;
        // color: $neutral-variant80;
      }
    }
    .total {
      margin-top: 1rem;
      border-top: 1px solid $neutral-variant90;
    }
    .amino {
      padding: 0.25rem 1rem;
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
      > .checkbox {
        &:hover {
          color: red;
        }
      }
      input {
        margin-left: 0.2rem;
        border-bottom: 1px solid $colors--primary;
        width: 2rem; // Ensures the input starts with at least 2rem width
        margin-bottom: 1px;
        &:focus {
        border-bottom: 2px solid $colors--primary;
        margin-bottom: 0px;
      }
      }
    }
    .name {
      width: 100%; // Allow it to expand and fill remaining space
      word-wrap: break-word;
    }
  }
  
  
  </style>