<template lang="pug">
.footer-wrapper 
  .element-wrapper
    .element-body 
      .footer-content
        span.title Aminoprofile
        .source 
          span Source: U.S. Department of Agriculture, Agricultural Research Service. FoodData Central, 2019. 
          a(href="https://fdc.nal.usda.gov/") fdc.nal.usda.gov
          span .
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
    font-family: "Young Serif";
    font-size: 18px;
  }
  > .source {
    margin-top: 1rem;
    color: $primary99;
    font-size: 13px;
    > a {
      color: $primary99;
    }
  }
}
</style>