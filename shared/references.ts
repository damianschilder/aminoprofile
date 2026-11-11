/**
 * Every source the site rests on, in one place (quiet-functionalism guides/sources.md). The list
 * on /sources is drawn from it, and every (i) panel names its sources with <UiSource>, whose
 * ids must be keys here: `node scripts/check-references.mjs` checks that, and that every
 * reference is cited somewhere. `read` is when the entry was last checked against the source
 * itself, kept here and not on the page.
 */
export interface Reference {
  /** The anchor on /sources: #ref-<id>. */
  id: string
  /** The mark in the text, author and year: "FAO (2013)". */
  short: string
  /** The full entry, without the link. */
  full: string
  url: string
  /** What the link shows. */
  urlLabel: string
  kind: 'data' | 'reference'
  /** Data sources: the licence their values are used under. */
  licence?: string
  read: string
}

export const REFERENCES: readonly Reference[] = [
  {
    id: 'usda-sr-legacy',
    short: 'USDA (2018)',
    full: 'U.S. Department of Agriculture, Agricultural Research Service. FoodData Central: SR Legacy, 2018.',
    url: 'https://fdc.nal.usda.gov/',
    urlLabel: 'fdc.nal.usda.gov',
    kind: 'data',
    licence: 'CC0 1.0',
    read: '2026-11 (the citation recorded when the dataset was built)',
  },
  {
    id: 'bls-4',
    short: 'MRI (2025)',
    full: 'Max Rubner-Institut (2025): Bundeslebensmittelschlüssel (BLS), Version 4.0, Deutsche Nährstoffdatenbank. Karlsruhe.',
    url: 'https://doi.org/10.25826/Data20251217-134202-0',
    urlLabel: 'doi.org/10.25826/Data20251217-134202-0',
    kind: 'data',
    licence: 'CC BY 4.0',
    read: '2026-11-11 (blsdb.de: version 4.0, free of licence barriers)',
  },
  {
    id: 'frida-5-5',
    short: 'DTU Food (2025)',
    full: 'Marija Langwagen, Jette Jakobsen, Tue Christensen and Anders Poulsen: The Danish Food Composition Database, Frida version 5.5, November 2025, National Food Institute, Technical University of Denmark.',
    url: 'https://doi.org/10.11583/DTU.29500682',
    urlLabel: 'doi.org/10.11583/DTU.29500682',
    kind: 'data',
    licence: 'CC BY 4.0',
    read: '2026-11 (the credit text Frida prescribes, recorded when the dataset was built)',
  },
  {
    id: 'mext-2023',
    short: 'MEXT (2023)',
    // MEXT's prescribed credit, word for word, with its own URL in brackets. The link below goes to the tables themselves.
    full: 'Source: Ministry of Education, Culture, Sports, Science and Technology (MEXT), Standard Tables of Food Composition in Japan 2020 (Eighth Revised Edition), Amino Acids, Updated and Enlarged Version 2023 (www.mext.go.jp). Processed by Aminoprofile: amino acids were converted to grams, expressed per gram of nitrogen and combined with other sources.',
    url: 'https://www.mext.go.jp/a_menu/syokuhinseibun/mext_00001.html',
    urlLabel: 'the tables at mext.go.jp',
    kind: 'data',
    licence: 'Government of Japan Standard Terms of Use, compatible with CC BY 4.0',
    read: '2026-11-11 (fooddb.mext.go.jp: the eighth edition, updated to 2023)',
  },
  {
    id: 'fao-2013',
    short: 'FAO (2013)',
    full: 'FAO (2013). Dietary protein quality evaluation in human nutrition. Report of an FAO Expert Consultation. FAO Food and Nutrition Paper 92. Rome: FAO. The scoring pattern for older children, adolescents and adults is Table 5, p. 29.',
    url: 'https://openknowledge.fao.org/handle/20.500.14283/i3124e',
    urlLabel: 'openknowledge.fao.org',
    kind: 'reference',
    read: '2026-11-11 (the PDF: Table 5 p. 29, the score as the lowest ratio p. 23, mixed diets p. 22, cut-offs p. 43)',
  },
  {
    id: 'eu-1169-2011',
    short: 'Regulation (EU) 1169/2011',
    full: 'Regulation (EU) No 1169/2011 of the European Parliament and of the Council of 25 October 2011 on the provision of food information to consumers. Annex I, point 10: protein = total Kjeldahl nitrogen × 6.25.',
    url: 'https://eur-lex.europa.eu/eli/reg/2011/1169/oj',
    urlLabel: 'eur-lex.europa.eu',
    kind: 'reference',
    read: '2026-11-11 (Annex I point 10, on legislation.gov.uk; EUR-Lex refused the automated fetch)',
  },
  {
    id: 'moughan-lim-2024',
    short: 'Moughan and Lim (2024)',
    full: 'Moughan PJ, Lim WXJ (2024). Digestible indispensable amino acid score (DIAAS): 10 years on. Frontiers in Nutrition 11:1389719. Section 6.7: the score of a meal is calculated from the amino acids each food supplies.',
    url: 'https://doi.org/10.3389/fnut.2024.1389719',
    urlLabel: 'doi.org/10.3389/fnut.2024.1389719',
    kind: 'reference',
    read: '2026-11-11 (sections 1 and 6.7)',
  },
  {
    id: 'fao-infoods-2012',
    short: 'FAO/INFOODS (2012)',
    full: 'FAO/INFOODS Guidelines for Food Matching. Version 1.2 (2012). FAO, Rome.',
    url: 'https://www.fao.org/4/ap805e/ap805e.pdf',
    urlLabel: 'fao.org',
    kind: 'reference',
    read: '2026-11-11 (title page and its "please cite as")',
  },
  {
    id: 'greenfield-southgate-2003',
    short: 'Greenfield and Southgate (2003)',
    full: 'Greenfield H, Southgate DAT (2003). Food composition data: production, management and use. Second edition. FAO, Rome. Chapter 9, conventions and modes of expression, and chapter 10, quality considerations in compiling a database.',
    url: 'https://www.fao.org/4/y4705e/y4705e00.htm',
    urlLabel: 'fao.org',
    kind: 'reference',
    read: '2026-11-11 (the table of contents)',
  },
];

export const REFERENCE_BY_ID: ReadonlyMap<string, Reference> = new Map(REFERENCES.map(r => [r.id, r]));

/** The anchor of a reference on the sources page. */
export const referenceHref = (id: string) => `/sources#ref-${id}`;

/** "fao-2013: Table 5 | eu-1169-2011: Annex I, point 10" → [{ id, at }]. The format <UiSource cite> takes. */
export function parseCite(cite: string): { id: string, at: string }[] {
  return cite.split('|').map((part) => {
    const [id, ...rest] = part.split(':');
    return { id: id.trim(), at: rest.join(':').trim() };
  }).filter(c => c.id);
}
