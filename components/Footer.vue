<template lang="pug">
footer.footer-wrapper
  .element-wrapper
    .element-body 
      .footer-content
        span.title Aminoprofile
        .source 
          span Data from the U.S., German, Danish and Japanese food composition tables, combined by Aminoprofile.
          span.separator ·
          NuxtLink(to="/foods") Foods
          span.separator ·
          NuxtLink(to="/data") Data
          span.separator ·
          NuxtLink(to="/sources") Sources
          span.separator ·
          NuxtLink(to="/privacy") Privacy
</template>

<style lang="scss" scoped>
.footer-wrapper {
  grid-area: 'footer';
  height: 7rem;
  background-color: $primary10;
}

.footer-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  > .title {
    font-family: $young-serif;
    font-size: 18px;
  }
  > .source {
    margin-top: 1rem;
    color: $primary99;
    font-size: 13px;
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
</style>