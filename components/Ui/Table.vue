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
          .none-selected( v-if="!foodsStore.selectedFoods.size")
            span Search and add foods to compare
          .row( v-else v-for="food in foodsStore.selectedFoods")
            .icons
              nuxt-icon(name="favorite/favorite")
              nuxt-icon.delete(name="delete" @click="deleteFood(food[0])")
              nuxt-icon(name="checkbox/checkbox empty")
            span.name {{ food[1].description }}{{ food.description }}
            .acids
              span {{  findValue(food[1].foodNutrients, 1214) }}
              span {{  findValue(food[1].foodNutrients, 1210) }}
              span {{  findValue(food[1].foodNutrients, 1211) }}
              span {{  findValue(food[1].foodNutrients, 1213) }}
              span {{  findValue(food[1].foodNutrients, 1221) }}
              span {{  findValue(food[1].foodNutrients, 1212) }}
              span {{  findValue(food[1].foodNutrients, 1219) }}
              span {{  findValue(food[1].foodNutrients, 1221) }}
              span {{  findValue(food[1].foodNutrients, 1215) }}
      .disclaimer
        span All values in grams


</template>

<script setup>
import { useFoodsStore } from '@/stores/foods'
const foodsStore = useFoodsStore();

function findValue(foodNutrients, nutrientId) {
  const result = foodNutrients.find(nutrient => {
  return nutrient.nutrientId == nutrientId
  })
  if (result) return result.value
  return ''
}

function deleteFood(fdcId) {
  foodsStore.selectedFoods.delete(fdcId)
}
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
    margin-left: 142px;
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
      color: $neutral-variant50;;
    }
    > .row {
      display: grid;
      grid-template-columns: min-content auto 754.733px;
      align-items: center;
      column-gap: 1rem;
      line-height: 1.3rem;
      height: 41.6px;
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
        > .delete {
          color: red;
          .nuxt-icon svg {
            color: red;
          }
        }
      }
      > span {
        color: $neutral-variant50;
      }
      > .name {
        color: $light--on-surface-variant;
      }
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