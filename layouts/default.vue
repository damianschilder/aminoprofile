<template lang="pug">
.layout-wrapper 
  Navbar
  .slot-wrapper
    slot
</template>

<script setup>
import { useFoodsStore } from '@/stores/foods'
const foodsStore = useFoodsStore();

// onMounted(() => {
//   foodsStore.searchFoods()
// })
</script>

<style lang="scss">
.layout-wrapper {
  > .slot-wrapper {
  }
}
</style>