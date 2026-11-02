<template lang="pug">
//- The default layout without the comparison table and without the "not on mobile yet" screen,
//- for text pages such as the privacy page, which must be readable on every screen size.
.layout-wrapper
  Navbar
  main.slot-wrapper
    slot
  Footer
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
  }
}

// The navbar and footer were only ever shown on large screens; give them some room on phones.
@include tablet-medium {
  :deep(.navbar-content), :deep(.footer-content) {
    padding: 0 1rem;
  }
  :deep(.footer-content) {
    text-align: center;
  }
}
</style>
