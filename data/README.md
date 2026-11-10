# Aminoprofile foods: dataset and method

The essential amino acids, cystine, tyrosine and protein of everyday foods, combined from four
national food composition databases. For every value the dataset records which laboratories or
databases measured it and how far they agree, so a reader can judge it.

Version 0.1.0 (November 2026): 64 foods, 259 links to source entries. **A draft**: every link is
proposed by the maintainer and still has to be confirmed by a second person
(`status` in `links.csv`).

## Files

| File | What it is |
|---|---|
| `foods.csv` | The curated list: id, plain name, category, aliases (`\|`-separated) and the words used to find candidates |
| `links.csv` | For each food, the source entries it is linked to: relation (`exact`, `close`, `broad`), status (`proposed`, `confirmed`, `rejected`) and the reason |
| `aminoprofile-foods.json` | The dataset: values, per amino acid the value per gram of nitrogen of each origin, the spread, outliers, flags, the links and the source releases with SHA-256 hashes |
| `aminoprofile-foods.csv` | The values and a quality summary, for spreadsheets |
| `foods-report.md` | The checks of the last build, for review |
| `../shared/foods.json` | What the site and the agent endpoint load |
| `sources/` | The downloaded source files (not committed) |

Values are grams per 100 g edible portion. Protein is nitrogen x 6.25, the definition of EU food
labelling (Regulation (EU) 1169/2011, Annex I).

## Sources

| Source | Release | Foods with amino acids | Lysine measured (not estimated) | Licence |
|---|---|---|---|---|
| USDA FoodData Central, SR Legacy | April 2018 | 5,101 | 2,172 (43%) | CC0 1.0 |
| Bundeslebensmittelschlüssel (BLS), Max Rubner-Institut | 4.0, December 2025 | 7,078 | 703 (10%) | CC BY 4.0 |
| Frida, DTU National Food Institute | 5.5, November 2025 | 1,105 | 710 of 987 (72%) | CC BY 4.0 |
| Standard Tables of Food Composition in Japan, Amino Acids (MEXT) | 2023, revised 27 March 2026 | 1,999 | 841 (42%) | Government of Japan Standard Terms of Use (CC BY 4.0 compatible) |

Measured with `node scripts/measure-sources.mjs`. Of the measured BLS lysine values, 238 are
analyses by the Max Rubner-Institut, 228 come from Souci-Fachmann-Kraut, 123 from USDA, 69 from
the literature and 45 from Danish data. Of Frida's, 550 are Danish analyses, 125 come from USDA
and 35 from McCance and Widdowson.

The USDA Foundation Foods CSV of 29 October 2026 has no `food.csv` or `food_nutrient.csv`, so
Foundation Foods (118 foods with amino acids) are not used yet. The Canadian Nutrient File is
not used: it is mostly adapted from USDA, and its terms do not allow changing its values, which
combining would do.

## Method

The steps follow the FAO/INFOODS Guidelines for Food Matching (2012) and Greenfield and
Southgate, *Food Composition Data* (FAO, 2003), chapters 9 and 10.

1. **Linking.** Every food is linked by hand to entries in the sources, after
   `node scripts/find-candidates.mjs` has listed candidates with their water, protein and the
   origin of their values. Food name, state (raw, dried, cooked) and water are compared, and fat
   for dairy and meat. `exact`: the same food in the same state. `close`: the same food with a
   small difference (variety, fat level, farmed or wild, grated or whole). `broad` links are
   documented only. A link that is wrong or has a data error is kept with status `rejected` and
   the reason, not deleted.
2. **Nitrogen.** Per source, the median nitrogen of its linked entries, converted to dry matter.
   Then the median over the sources, back at the median water content of the linked entries.
   Where a source gives no nitrogen, it is protein divided by that source's own factor
   (USDA: per food, BLS: 6.25, MEXT: from its table per gram of nitrogen, Frida: reported).
3. **Amino acids per gram of nitrogen.** Comparing per gram of nitrogen removes differences in
   water content and in the nitrogen-to-protein factor each source uses. This is the reference
   level for amino acids in Greenfield and Southgate.
4. **One vote per origin.** Each measured value is attributed to its origin: the laboratory or
   database that measured it. A BLS or Frida value copied from USDA counts as USDA, so one
   measurement never counts twice. Per origin the median, then the median over the origins.
5. **Estimates only as a fallback.** Values a source borrowed from a similar food, scaled from
   another form, calculated or imputed are used only when no source measured that amino acid
   for the food, and the food is then marked as estimated for it.
6. **Values.** Grams per 100 g = amino acid per gram of nitrogen x nitrogen.

### Checks

Every build writes `foods-report.md` with these checks. Nothing is silently dropped: what is left
out is named, with the reason.

- **Repeated values.** A USDA or BLS entry with the same value (3 or more significant digits) for
  three or more amino acids is left out as a data error. This catches 10 of the 5,101 USDA
  SR Legacy foods, among them three cheeses: in `173414` (cheddar) histidine, methionine and
  tryptophan are all 0.547 g and lysine is half of what the other sources give.
- **Outliers.** With three or more origins, an origin further than 40% from the median of the
  others is left out of that amino acid, and named in the report.
- **Spread.** Where the remaining origins differ by more than 25% for an amino acid, the report
  says so.
- **Water.** Linked entries whose dry matter differs more than 10% from the median are named.
  Their nitrogen is adjusted, as step 2 describes.
- **Plausibility.** The nine essential amino acids should add up to 1.6 to 3.6 g per gram of
  nitrogen.

### Known limits

- **Non-protein nitrogen.** Vegetables (nitrate) and mushrooms (chitin) contain nitrogen that is
  not protein. Nitrogen x 6.25 then overstates their protein, and their amino acid score comes
  out low. The sources also differ in how they deal with it, so these foods disagree more.
- **Histidine in meat and fish.** The MEXT values for poultry are about 40% higher than the
  others, probably because they include histidine from anserine and carnosine. Tuna and other
  scombroid fish contain much free histidine. The outlier check leaves the poultry values out.
- **Methods.** Tryptophan, methionine and cystine need special hydrolysis, and the sources differ
  most on them. They are also often the limiting amino acids.
- **Digestibility.** The values are total amino acids, not digestible ones, so a score from them
  is an amino acid score, not a DIAAS.
- **Single sources.** Five foods have only one independent source for some essential amino acid
  (`independentSources` is 1 or 0 in the dataset).

## Rebuilding

```bash
npm run data:fetch                     # USDA and MEXT (BLS and Frida go in data/sources/ by hand)
npm run data:measure                   # the source table above
npm run data:candidates                # data/candidates.txt, to choose links
npm run data:build                     # writes the dataset, the CSV, the report and shared/foods.json
```

The build records the SHA-256 of every source file in `aminoprofile-foods.json`. Same source
files and the same `foods.csv` and `links.csv` give the same output.

## Licence and attribution

The dataset is available under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Credit
Aminoprofile and the four sources:

- U.S. Department of Agriculture, Agricultural Research Service. FoodData Central: SR Legacy,
  2018. https://fdc.nal.usda.gov/
- Max Rubner-Institut (2025): Bundeslebensmittelschlüssel (BLS), Version 4.0, Deutsche
  Nährstoffdatenbank. Karlsruhe. DOI: 10.25826/Data20251217-134202-0
- Marija Langwagen, Jette Jacobsen, Tue Christensen and Anders Poulsen: The Danish Food
  Composition Database, Frida version 5.5, November 2025, National Food Institute, Technical
  University of Denmark. https://doi.org/10.11583/DTU.29500682
- Source: Ministry of Education, Culture, Sports, Science and Technology (MEXT), Standard Tables
  of Food Composition in Japan 2020 (Eighth Revised Edition), Amino Acids, Updated and Enlarged
  Version 2023 (https://www.mext.go.jp/). Processed by Aminoprofile: amino acids were converted
  to grams, expressed per gram of nitrogen and combined with other sources.

The values were changed: combined, converted and recalculated as the method above describes.
No source endorses this dataset.

## References

- FAO/INFOODS Guidelines for Food Matching, version 1.2 (2012). FAO, Rome.
- Greenfield H, Southgate DAT. Food Composition Data: Production, Management and Use, 2nd
  edition. FAO, Rome, 2003. Chapters 9 and 10.
- FAO (2013). Dietary protein quality evaluation in human nutrition. FAO Food and Nutrition
  Paper 92.
- Gebru T et al. Datasheets for Datasets. Communications of the ACM 64(12), 2021. This file
  follows its outline: motivation, composition, collection, processing, uses, distribution.
