<template lang="pug">
.layout-wrapper 
  Navbar
  .slot-wrapper
    slot
  Footer
  .noMobile
    h2 Aminoprofile
    span will be available on mobile soon.
</template>

<style lang="scss" scoped>
.layout-wrapper {
  display: grid;
  height: 100%;

  grid-template-columns: 100%;
  grid-template-areas:
    'navbar'
    'nuxt'
    'footer';
  grid-template-rows: 75px auto 112px;
  > .slot-wrapper {
    grid-area: nuxt;
    margin-bottom: 5rem;
    height: 100%;
  }
}

.noMobile {
  display: none;
  position: absolute;
  width: 100%;
  flex-direction: column;
  height: 100%;
  justify-content: center;
  align-items: center;
  background-color: $primary10;
  color: white;
  > h2 {
    font-family: "Young Serif";
  }
}

@include tablet-medium {
  .slot-wrapper {
    display: none;
  }
  .noMobile {
    display: flex;
  }
}
</style>