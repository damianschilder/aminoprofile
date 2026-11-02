<template lang="pug">
.page-wrapper
  .element-wrapper
    .element-body
      .content
        UiBack
        h1 Privacy
        p.intro Aminoprofile shows the essential amino acid content of foods. This page explains which data is involved and what your rights are.
        .questions
          .question
            h3 Who is responsible?
            p Aminoprofile is a personal project by Damian Schilder. You can send questions and requests to #[a(href="mailto:parels.app@gmail.com") parels.app@gmail.com].
          .question
            h3 What does Aminoprofile record about you?
            p Nothing that identifies you. Aminoprofile uses no cookies, has no accounts and uses no advertising or tracking services. The foods you add to the table stay in your browser tab and are gone when you close or reload it.
          .question
            h3 What happens to your searches?
            p To find results, the text you type in the search box is sent to USDA FoodData Central, the food database of the U.S. Department of Agriculture, through the Aminoprofile server. Only the search text is sent, not your IP address or anything else about you. The server keeps the results of a search for at most a day, in its memory and in Cloudflare's cache, so a repeated search is faster, and does not store them anywhere else. Your browser may keep them for an hour.
          .question
            h3 Visitor statistics
            p If visitor numbers are measured, this is done with Cloudflare Web Analytics, which works without cookies and without collecting personal data.
          .question
            h3 Hosting
            p Aminoprofile is hosted by Cloudflare. To deliver the site and protect it against abuse, Cloudflare processes technically necessary data such as your IP address. This is based on a legitimate interest (Article 6(1)(f) GDPR): offering a working and secure website.
          .question
            h3 Your rights and complaints
            p You can ask which data about you is processed, or object to it, by sending an email to the address above. If we cannot resolve it together, you have the right to lodge a complaint with the Dutch Data Protection Authority, the #[a(href="https://autoriteitpersoonsgegevens.nl/") Autoriteit Persoonsgegevens].
        p.updated Last updated: 2 November 2026
</template>

<script setup lang="ts">
definePageMeta({ layout: 'plain' });

useHead({
  title: 'Privacy - Aminoprofile',
  meta: [
    { name: 'description', content: 'Which data Aminoprofile uses and what your rights are.' },
  ],
});
</script>

<style lang="scss" scoped>
.content {
  max-width: 720px;
  @include tablet-medium {
    padding: 0 1rem;
  }
  > h1 {
    margin-top: 2rem;
  }
}

.intro {
  margin-top: 1rem;
}

.questions {
  display: flex;
  flex-direction: column;
  row-gap: 2rem;
  margin-top: 2.5rem;
  > .question {
    display: flex;
    flex-direction: column;
    row-gap: 0.25rem;
    > h3 {
      color: $neutral-variant30;
    }
  }
}

a {
  color: $colors--primary;
}

.updated {
  margin-top: 3rem;
  font-size: 13px;
  color: $neutral-variant50;
}
</style>
