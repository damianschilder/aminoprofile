<template lang="pug">
header.navbar-wrapper
  .element-wrapper
      .element-body
        .navbar-content
          //- The name leads back to the search, also from the privacy and "not found" pages.
          NuxtLink.home(to="/") Aminoprofile
          nav.links(aria-label="Main")
            NuxtLink(to="/foods") Foods
            NuxtLink(to="/data") Data
            NuxtLink(to="/sources") Sources
</template>

<style lang="scss">
.navbar-wrapper {
  grid-area: 'navbar';
  height: 75px;
  background-color: white;
  filter: drop-shadow(0px 4px 1px rgba(0, 0, 0, 0.25));
}

.element-wrapper{
  height: 100%;
}

.navbar-content {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  column-gap: 1rem;
  font-family: $young-serif;
  font-size: 24px;
  color: $primary20;
  > .home {
    color: inherit;
    text-decoration: none;
  }
  > .links {
    display: flex;
    column-gap: 1.25rem;
    font: 600 15px/20px $mulish;
    > a {
      color: $neutral-variant30;
      text-decoration: none;
      // At least 24px high to tap (WCAG 2.2 SC 2.5.8).
      padding: 2px 0;
      &:hover, &.router-link-active {
        color: black;
        text-decoration: underline;
        text-underline-offset: 4px;
      }
    }
  }
  // The name and three links fit a 360px phone only a size smaller.
  @media (max-width: 400px) {
    font-size: 20px;
    > .links {
      column-gap: 1rem;
    }
  }
}
</style>
