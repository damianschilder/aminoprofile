// Cloudflare Web Analytics: counts visits without cookies, local storage or personal data, so
// it needs no consent banner. Loaded only when NUXT_PUBLIC_CF_BEACON_TOKEN is set.
export default defineNuxtPlugin(() => {
  const token = useRuntimeConfig().public.cfBeaconToken;
  if (!token) return;
  useHead({
    script: [{
      src: 'https://static.cloudflareinsights.com/beacon.min.js',
      defer: true,
      'data-cf-beacon': JSON.stringify({ token }),
    }],
  });
});
