<template lang="pug">
.component-wrapper 
  NuxtLink(to="/")
    nuxt-icon(name="back")
    span Go back
</template>

<style lang="scss" scoped>
a {
  display: flex;
  align-items: center;
  text-decoration: none;
  cursor: pointer;
  color: $neutral-variant30;
  &:hover {
    color: black;
  }
}
:deep(.nuxt-icon svg) {
  height: fit-content;
  width: 1.5rem;
}
</style>