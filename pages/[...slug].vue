<script setup lang="ts">
// Every address without a page of its own: show the "Page not found" page (error.vue) with a
// real 404 status, instead of letting the router warn about an unknown route.
throw createError({ statusCode: 404, statusMessage: 'Page not found' });
</script>

<template lang="pug">
div
</template>
