<template lang="pug">
.layout-wrapper 
  Navbar
  main.slot-wrapper
    slot
    //- UiTable.table
    UiTableV2.table
  Footer
  .noMobile
    h1.title Aminoprofile
    span will be available on mobile soon.
    NuxtLink.privacy(to="/privacy") Privacy
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
    > .table {
      margin-top: 5rem;
    }
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
  > .title {
    font: bold 1.375rem/1.9375rem "Young Serif"; // as the h2 it was: 22px/31px
  }
  > .privacy {
    position: absolute;
    bottom: 2rem;
    font-size: 13px;
    color: $primary99;
    &:focus-visible {
      outline-color: $primary99;
    }
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