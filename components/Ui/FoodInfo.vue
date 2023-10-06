<template lang="pug">
.component-wrapper
  .element-wrapper
      .element-body 
        h1 {{foodsStore.activeFood.description}}
        .grid-container
          .nutrients 
            .nutrient( v-for="nutrient in foodsStore.activeFood.foodNutrients")
              span {{ nutrient.nutrientName }}
              span {{ nutrient.value }}
  
</template>

<script setup lang="ts">
const foodsStore = useFoodsStore();

</script>

<style lang="scss" scoped>
.grid-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  > .nutrients {
    margin-top: 2rem;
    display: flex;
    flex-direction: column;
    row-gap: 00.5rem;
    > .nutrient {
  
    }
  }

}
</style>