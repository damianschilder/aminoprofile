<template lang="pug">
.layout-wrapper 
  Navbar
  .slot-wrapper
    slot
  Footer
</template>

<style lang="scss" scoped>
.layout-wrapper {
  display: grid;
  grid-template-columns: 100%;
  grid-template-areas:
    'navbar'
    'nuxt'
    'footer';
  grid-template-rows: auto 1fr auto;
  > .slot-wrapper {
    grid-area: nuxt;
    margin-bottom: 5rem;
  }
}
</style>