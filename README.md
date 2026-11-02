# Aminoprofile

Search for foods and compare their essential amino acids. Aminoprofile looks foods up in
[USDA FoodData Central](https://fdc.nal.usda.gov/), shows which results have amino acid data,
and adds up the nine essential amino acids and protein of the foods you pick.

![Search results for "chicken breast"](docs/screenshots/search.png)

![The essential amino acids table with two foods and their total](docs/screenshots/amino-acids.png)

## What it does

- **Search.** Type a food and press Enter. Results come from the *Foundation Foods* data set of
  FoodData Central. Foods with amino acid data are listed first and marked with a green sprout;
  the number next to it is how many nutrients USDA has for that food.
- **Compare.** Click a food to add it to the *Essential amino acids* table: histidine,
  isoleucine, leucine, lysine, methionine, phenylalanine, threonine, tryptophan, valine and
  protein, in grams.
- **Combine.** Change the amount per food (100 g by default) and tick the foods to include. The
  *Total* row adds them up, so you can see what a combination of foods gives you.

Aminoprofile is a desktop site. Below 1240 pixels wide it shows a "will be available on mobile
soon" screen, as it did in 2023.

## Origin

Aminoprofile was built by hand in October 2023, without any AI assistance: Nuxt 3, Vue,
Pinia, Pug templates and SCSS, with its own colour palette and typefaces (Mulish and Young
Serif). It ran at aminoprofile.com until it was taken offline.

## 2026 maintenance

In November 2026 the site was prepared to go back online. This maintenance was done with
[Claude Code](https://claude.com/claude-code). The look, the texts and the way the site works
were deliberately left as they were in 2023. What changed:

- **API key on the server.** The browser used to call FoodData Central directly, so the API key
  was shipped in the JavaScript bundle. Searches now go through a server route
  (`server/api/foods/search.get.ts`) that holds the key. That route accepts only a search term
  of 2 to 100 characters, has a 10 second timeout, passes on no upstream error details, and
  keeps a small, size-capped cache for ten minutes.
- **Analytics without cookies.** Google Analytics was replaced by Cloudflare Web Analytics,
  which uses no cookies and collects no personal data. It is only loaded when a token is
  configured. Without cookies, the site needs no cookie banner.
- **Security headers.** `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`,
  `Permissions-Policy`, `Strict-Transport-Security` and a light `Content-Security-Policy`, set in
  `routeRules` in `nuxt.config.ts`.
- **Privacy page** at `/privacy`, linked from the footer (and from the mobile screen).
- **Dependencies.** Upgraded from Nuxt 3.7 to Nuxt 4 and Pinia 4. Unused packages were removed,
  and the build output that had been committed by accident was taken out of the repository.

## Stack

- [Nuxt 4](https://nuxt.com/) (Vue 3, Nitro), keeping the original root folder layout
- [Pinia](https://pinia.vuejs.org/) for the search results and the selected foods
- Pug templates and SCSS
- [nuxt-icons](https://github.com/gitFoxCode/nuxt-icons) for the SVG icons
- [USDA FoodData Central API](https://fdc.nal.usda.gov/api-guide) for the food data
- Hosted on [Cloudflare Workers](https://developers.cloudflare.com/workers/) (Nitro preset
  `cloudflare-module`)

## Running it locally

You need Node.js 22.22.3+, 24.15+ or 26 (the versions Nuxt 4.6 supports).

```bash
npm install
cp .env.example .env   # optional, see below
npm run dev            # http://127.0.0.1:3000
```

### Environment variables

| Variable | Required | What it does |
| --- | --- | --- |
| `NUXT_FOODCENTRAL_API_KEY` | No | Your FoodData Central API key ([free sign-up](https://fdc.nal.usda.gov/api-key-signup)). Only the server uses it; it never reaches the browser. **When it is not set, the server falls back to USDA's shared `DEMO_KEY`**, which is heavily rate limited and only meant for trying things out. Set a real key for anything public. |
| `NUXT_PUBLIC_CF_BEACON_TOKEN` | No | Cloudflare Web Analytics token. When it is not set, no analytics script is loaded at all. |

To run a production build as a plain Node server instead of a Worker:

```bash
NITRO_PRESET=node-server npm run build
node .output/server/index.mjs
```

## Deploying to Cloudflare Workers

The default build targets Cloudflare Workers:

1. `npm run build` writes the Worker to `.output/`, including `.output/server/wrangler.json`
   (Worker name `aminoprofile`, compatibility date and static assets) and
   `.output/public/_headers` (the security headers for static files).
2. `npx wrangler deploy` deploys the build (it finds the generated config through
   `.wrangler/deploy/config.json`). With Cloudflare's Git integration (Workers Builds), use
   `npm run build` as the build command and `npx wrangler deploy` as the deploy command.
3. Set the variables as Worker secrets, so later deploys keep them:
   `npx wrangler secret put NUXT_FOODCENTRAL_API_KEY --name aminoprofile` and, if you use
   analytics, `npx wrangler secret put NUXT_PUBLIC_CF_BEACON_TOKEN --name aminoprofile`.
   The server reads them on every request, so no rebuild is needed.
4. Attach the domain under the Worker's *Settings → Domains & Routes*. The domain has to use
   Cloudflare DNS.
5. Add a WAF rate limiting rule for `/api/foods/search`, for example 10 requests per 10 seconds
   per IP address. Every search that is not cached uses the FoodData Central quota of the API
   key (1,000 requests per hour by default), so this keeps one visitor from using it all up.

## Data

Food data: U.S. Department of Agriculture, Agricultural Research Service. FoodData Central,
2019. [fdc.nal.usda.gov](https://fdc.nal.usda.gov/). FoodData Central data is in the public
domain.
