<template lang="pug">
.navbar-wrapper
  .element-wrapper
      .element-body 
        .navbar-content
          span Aminoprofile
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
  font-family: "Young Serif";
  font-size: 24px;
  color: $primary20;
}
</style>