# Aminoprofile

**[aminoprofile.com](https://aminoprofile.com)**: search for foods and compare their essential
amino acids.

Aminoprofile looks foods up in [USDA FoodData Central](https://fdc.nal.usda.gov/), shows which
results have amino acid data, and adds up the nine essential amino acids and protein of the foods
you pick.

![Search results for "chicken breast", with a message that a food was added to the table](docs/screenshots/search.png)

![The essential amino acids table with three foods and their total](docs/screenshots/amino-acids.png)

## Why it exists

Coming from competitive sport, Damian wanted to be sure he was getting complete protein: enough
of each essential amino acid, not just enough protein in total. Foods differ in which amino acids
they contain and how much, but the nutrition labels in the supermarket only list total protein,
so a package could not tell him whether his meals added up. Aminoprofile looks up the amino acid
profile of each food and adds them up across the foods you combine.

## What it does

- **Search.** Type a food and press Enter. Results come from the *Foundation Foods* and
  *SR Legacy* data sets of FoodData Central, the two that have amino acid data. Foods with amino
  acid data are listed first and marked with a green sprout; the number next to it is how many
  nutrients USDA has for that food.
- **Compare.** Click a food (or press Enter on it) to add it to the *Essential amino acids*
  table. A message at the bottom confirms it, with a button that takes you to the table. The
  columns are histidine, isoleucine, leucine, lysine, methionine, phenylalanine, threonine,
  tryptophan, valine and protein, in grams; hover an abbreviation for its full name. A value
  USDA does not have shows as a dash (—), which is not the same as 0.
- **Combine.** Change the amount per food (100 g by default) and tick the foods to include. The
  *Total* row adds up the ticked rows, so you can see what a combination of foods gives you.
- **Protein quality.** Under the total, *Per g protein* shows how many milligrams of each
  essential amino acid one gram of the ticked foods' protein holds, and *Needed* below it how
  many the [FAO (2013)](https://openknowledge.fao.org/handle/20.500.14283/i3124e) scoring
  pattern for ages 3 and up asks. A value under the bar is red, and the lowest is bold.
  Methionine counts together with cystine, and phenylalanine with tyrosine, as in the pattern.
  Under *Protein* it says *Complete* or *Short*, and a sentence under the table names what is
  short and the foods of Aminoprofile's dataset with the most of it per gram of protein
  (`shared/richest-foods.json`, made by `npm run data:build`). Hover a value for its share of the
  pattern, the amino acid score. It is not corrected for digestibility, which would lower most
  plant foods, so it is not a DIAAS.
  When a ticked food has no value for an amino acid, its total is marked "≥": the real amount is
  at least that.

Aminoprofile is a desktop site. Below 1240 pixels wide it shows a "will be available on mobile
soon" screen, as it did in 2023.

## How it was built

### 2023–2024: designed in Figma, built by hand

- **Designed in Figma first**, closely following Google's
  [Material Design 3](https://m3.material.io/), which inspired it: the colour roles and tonal
  palettes (`assets/style/_variables.scss`), the surfaces, and the Material Symbols icons. The
  typefaces are Mulish and Young Serif.
- **Built by hand, without any AI assistance**: 14 commits in October 2023, and a new amino acid
  table in autumn 2024. Nuxt 3, Vue, Pinia, Pug templates and SCSS.
- It ran at aminoprofile.com until October 2025, when it was taken offline. It has been back
  online since November 2026.

### November 2026: back online, with Claude Code

Put back online with [Claude Code](https://claude.com/claude-code). The look and the texts are
those of 2023. Under the hood: the API key moved off the page to the server, three columns that
showed the wrong amino acid were fixed, about 5,000 more foods have amino acid data, searches and
fonts are faster, and Google Analytics and its cookies are gone. Four small additions in the same
Material 3 style: a favicon, full names on hover, a dash for missing values, and a message when a
food is added. The details are under [Technical notes](#technical-notes).

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
| `NUXT_FOODCENTRAL_API_URL` | No | Only for testing against a local stand-in of the API. Default `https://api.nal.usda.gov/fdc/v1`. |

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
   Add a second one for `/mcp` (see [For AI agents (MCP)](#for-ai-agents-mcp)).

## Technical notes

What the November 2026 work changed, in more detail.

- **Search route.** `server/api/foods/search.get.ts` holds the API key, accepts only a search term
  of 2 to 100 characters, has a 15 second timeout and passes on no upstream error details. Every
  word typed must be in the food's name (if that finds nothing, any word will do), and the 25
  best matches are shown. The server picks the twelve values the page uses out of USDA's answer:
  the ten columns, plus cystine and tyrosine for the score.
- **Nutrients.** One shared list in `shared/nutrients.ts` maps each column to USDA's nutrient id.
  The score is worked out in `shared/scoring.ts`, with the FAO pattern written out there.
  Foundation Foods has amino acids for 118 of its 424 foods, SR Legacy for about 5,100 of 7,793.
  Removing a food no longer unticks another one, and a food cannot be added twice.
- **Searching.** A newer search cancels an older one, and pressing Enter twice asks only once.
  "Too many searches" shows the wait the server gives in `Retry-After`; "no internet connection"
  and "database unavailable" come with a *Try again* button. What is on screen stays until the
  next answer arrives, and the spinner only appears when an answer takes longer than 150 ms, so
  cached answers do not flicker.
- **Caching.** Answers are kept in the server's memory (an hour, at most 200 searches), in
  Cloudflare's cache (`caches.default`, a day) and in the browser (`Cache-Control`, an hour).
  Identical searches that arrive at the same time ask USDA once (`server/utils/searchCache.ts`).
- **Fonts.** Mulish and Young Serif are served as WOFF2 files with only the Latin characters, are
  preloaded, and use `font-display: swap`. Until they arrive, text shows in Arial and the name in
  Times New Roman, resized to take the same room (`size-adjust` and the metric overrides in
  `assets/style/app.scss`), so the page hardly moves when the fonts swap in. Before, the name
  stayed invisible until its font had loaded (3.2 s on a slow connection). The `*-Latin.woff2`
  files were made from the TTF files next to them with
  [subset-font](https://github.com/papandreou/subset-font) 2.9 (HarfBuzz), `targetFormat:
  'woff2'`, for the characters of Google Fonts' "latin" range (U+0020-007E, U+00A0-00FF,
  U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329,
  U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD). All OpenType
  features and the whole weight axis of Mulish are kept.
- **No stylesheet to wait for.** The global stylesheet (2.5 kB) is inlined in the HTML, as the
  component styles already were (`features.inlineStyles` in `nuxt.config.ts`). Everything under
  `/_nuxt/` has a content hash in its name and is cached for a year (`immutable`, in the
  generated `_headers`). Without JavaScript the page says that search needs it.
- **Search engines, AI assistants and shared links.** `public/robots.txt` lets every crawler read
  the pages, the dataset in `/data/` and `/llms.txt`, but not `/api/` or `/mcp` (a POST endpoint
  for MCP clients, with nothing to crawl). It names the AI crawlers (GPTBot, OAI-SearchBot,
  ChatGPT-User, ClaudeBot, Claude-SearchBot, Claude-User, PerplexityBot, Google-Extended,
  Applebot-Extended, CCBot) with the same rules. `public/sitemap.xml` lists the three pages, and
  `public/llms.txt` ([llmstxt.org](https://llmstxt.org/)) says what the site does, describes the
  dataset and the MCP server, asks agents to use those rather than scrape the pages, and says
  whom to contact. Each page has its own title, description and canonical link
  (`shared/site.ts`), Open Graph and Twitter card tags with a 1200x630 picture in the site's style
  (`public/og-image.png`, made from `docs/og-image.html`). In JSON-LD the home page describes
  itself as a `WebApplication` based on FoodData Central and the Aminoprofile dataset, and `/data`
  describes the dataset as a `Dataset` (with its downloads, sources, licence and measured
  values), for Google's dataset search. There is a `theme-color` and a web manifest with the app
  icons.
- **Accessibility.** The search, info, remove and tick icons are real buttons with a visible focus
  ring; the page has `lang="en"`, landmarks and a correct heading order. The few grey texts that
  measured below WCAG AA contrast were darkened by an invisible amount. Greyed-out results and
  unticked rows stay pale on purpose: they are inactive.
- **Layout.** In the search results the nutrient count sits on the first line of a two-line
  name, like the category; in the table a two-line name gets the same room above and below as
  the amounts, so it no longer touches the next row.
- **Security headers.** `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`,
  `Permissions-Policy`, `Strict-Transport-Security` and a light `Content-Security-Policy`, set in
  `routeRules` in `nuxt.config.ts`. The two dataset files also get
  `Access-Control-Allow-Origin: *` and a day of caching, and the CSV is served as
  `text/csv; charset=utf-8`. On Cloudflare all of these reach the static files through the
  generated `_headers`. The privacy page is at `/privacy` and the data page at `/data`, both
  linked from the footer and from the mobile screen.
- **The four additions.** The favicon set is SVG, ICO (16/32/48), a 180 px iPhone icon and
  192/512 px manifest icons (one maskable); `scripts/make-favicons.py` makes them from
  `assets/icons/minerals.svg`. The tooltips are CSS only (`data-tip` in
  `components/Ui/TableV2.vue`); a dash is read out as "No data". The snackbar
  (`components/Ui/Search.vue`) hides itself after 4 seconds or at the next search, and *View*
  scrolls to the table and focuses its heading.

## For AI agents (MCP)

Aminoprofile is also an [MCP](https://modelcontextprotocol.io/) server, so AI assistants can
look foods up and score combinations as a tool. It answers from the dataset described under
[Data](#data).

- **Endpoint:** `https://aminoprofile.com/mcp`, MCP Streamable HTTP transport. Stateless,
  read-only, no login, CORS open.
- **Tools:**
  - `search_foods` `{ query?, category?, limit? }`: foods with id, name, category, protein per
    100 g and the number of independent sources.
  - `get_food` `{ id }`: grams per 100 g of protein and 11 amino acids, the food's amino acid
    score and limiting amino acid, the quality of the values (origins, independent sources,
    spread, estimated), links to the dataset and the method, and the licence.
  - `score_foods` `{ items: [{ id, grams }] }`: totals in grams, the amino acid score of the
    combination per amino acid (FAO 2013 pattern for ages 3 and up, methionine with cystine,
    phenylalanine with tyrosine), the limiting amino acid and notes. Like the Score row, it is
    not corrected for digestibility, so it is not a DIAAS.
- Food ids look like `egg-whole-raw`, `peanut-butter` and `oats-rolled`.

To connect:

- **Claude Code:** `claude mcp add --transport http aminoprofile https://aminoprofile.com/mcp`
- **Claude** (claude.ai and the desktop app): *Settings → Connectors*, add a custom connector
  with the URL `https://aminoprofile.com/mcp`.
- **Other clients** that support remote MCP servers over Streamable HTTP: the same URL.

Rate limiting: add a Cloudflare WAF rate limiting rule for `/mcp`, like the one for
`/api/foods/search` (for example 10 requests per 10 seconds per IP address). The server does not
call USDA, so there is no quota to protect, but the rule keeps one client from using up the
Worker's requests.

## Data

The site searches U.S. Department of Agriculture, Agricultural Research Service. FoodData
Central, 2019. [fdc.nal.usda.gov](https://fdc.nal.usda.gov/). FoodData Central data is in the
public domain.

**Aminoprofile's own food dataset** (version 0.1.0, a draft). 64 everyday foods with plain
names, each combined from USDA FoodData Central, the German Bundeslebensmittelschlüssel 4.0, the
Danish Frida 5.5 and the Japanese MEXT amino acid tables, with for every value which
laboratories measured it and how far they agree. It is published at
[aminoprofile.com/data](https://aminoprofile.com/data), as
[JSON](https://aminoprofile.com/data/aminoprofile-foods.json) and
[CSV](https://aminoprofile.com/data/aminoprofile-foods.csv) (the files are in `public/data/`),
under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The curated lists are in
`data/`, and the method, the checks, the known limits and the credits in
[data/README.md](data/README.md). The MCP server answers from it. The search on the page still
uses FoodData Central.

Every food in it has its own page at `/foods/<id>`, with a list at
[aminoprofile.com/foods](https://aminoprofile.com/foods): the amino acids, the score, what to
combine it with, how far the sources agree and the source entries. The numbers are worked out on
the server from `shared/foods.json` (`server/utils/foodPages.ts`), and `/sitemap.xml` is made
from the same list (`server/routes/sitemap.xml.ts`), so a new food needs no hand edits.

## License

The code is available under the [MIT License](LICENSE). The food data is not covered by this
license: FoodData Central is in the public domain, and the Aminoprofile dataset (`data/` and
`public/data/`) is under CC BY 4.0 with the credits in [data/README.md](data/README.md). The typefaces in `assets/fonts`, Mulish
and Young Serif, are under the SIL Open Font License 1.1; each folder holds its `OFL.txt`.
