<template lang="pug">
.layout-wrapper 
  Navbar
  main.slot-wrapper
    slot
    UiTableV2.table
  Footer
  //- Not an h1: the page's one h1 is the search heading (components/Ui/Search.vue).
  .noMobile
    p.title Aminoprofile
    span will be available on mobile soon.
    .links
      NuxtLink(to="/foods") Foods
      span.separator ·
      NuxtLink(to="/data") Data
      span.separator ·
      NuxtLink(to="/privacy") Privacy
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
    font: bold 1.375rem/1.9375rem $young-serif; // as the h2 it was: 22px/31px
  }
  // Foods, Data and Privacy, as in the footer.
  > .links {
    position: absolute;
    bottom: 2rem;
    font-size: 13px;
    color: $primary99;
    > a {
      color: $primary99;
      &:focus-visible {
        outline-color: $primary99;
      }
    }
    > .separator {
      margin: 0 0.5rem;
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