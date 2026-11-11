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
            h2 Who is responsible?
            p Aminoprofile is a personal project by Damian Schilder. You can send questions and requests to #[a(href="mailto:parels.app@gmail.com") parels.app@gmail.com].
          .question
            h2 What does Aminoprofile record about you?
            p Nothing that identifies you. Aminoprofile uses no cookies, has no accounts and uses no advertising or tracking services. The foods you add to the table stay in your browser tab and are gone when you close or reload it.
          .question
            h2 What happens to your searches?
            p Nothing happens to them. The search runs in your browser, over Aminoprofile's own list of foods that comes with the page, so what you type is not sent anywhere.
          .question
            h2 The MCP server for AI agents
            p Aminoprofile has a public MCP server that AI assistants can use to look foods up (see #[NuxtLink(to="/data") Data]). When an assistant uses it, the server receives only what the assistant asks for: a search text, food ids and amounts in grams. There is no account. The server answers from Aminoprofile's own dataset, and Aminoprofile does not store the questions or the answers. Like the rest of the site, the requests pass through Cloudflare, as described under Hosting.
          .question
            h2 Visitor statistics
            p If visitor numbers are measured, this is done with Cloudflare Web Analytics, which works without cookies and without collecting personal data.
          .question
            h2 Hosting
            p Aminoprofile is hosted by Cloudflare. To deliver the site and protect it against abuse, Cloudflare processes technically necessary data such as your IP address. This is based on a legitimate interest (Article 6(1)(f) GDPR): offering a working and secure website.
          .question
            h2 Your rights and complaints
            p You can ask which data about you is processed, or object to it, by sending an email to the address above. If we cannot resolve it together, you have the right to lodge a complaint with the Dutch Data Protection Authority, the #[a(href="https://autoriteitpersoonsgegevens.nl/") Autoriteit Persoonsgegevens].
        p.updated Last updated: 11 November 2026
</template>

<script setup lang="ts">
import { SITE_NAME, SITE_URL } from '#shared/site';

definePageMeta({ layout: 'plain' });

const title = `Privacy - ${SITE_NAME}`;
const description = 'Which data Aminoprofile uses and what your rights are.';
const url = `${SITE_URL}/privacy`;

useSeoMeta({ title, description, ogTitle: title, ogDescription: description, ogUrl: url });
useHead({ link: [{ rel: 'canonical', href: url }] });
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
    // h2 for the heading order (h1, then h2), with the look of the h3 these were.
    > h2 {
      font: bold 1.125rem/1.5625rem $mulish; // 18/25px
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
  color: $neutral-variant50-text;
}
</style>
