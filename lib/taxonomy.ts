import taxonomyDocument from '@/data/tech-skills-taxonomy.json';

export type TaxonomyEntry = {
  name: string;
  category: string;
};

export type TaxonomyMatch = TaxonomyEntry & {
  matchType: 'exact' | 'alias' | 'fuzzy';
};

export function taxonomyKey(value: string) {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/#/g, 'sharp')
    .replace(/\+/g, 'plus')
    .replace(/[^a-z0-9]+/g, '');
}

const firstByName = new Map<string, TaxonomyEntry>();
for (const group of taxonomyDocument.categories)
  for (const name of group.skills)
    if (!firstByName.has(name))
      firstByName.set(name, { name, category: group.category });

export const taxonomyEntries = [...firstByName.values()];
export const taxonomyNames = taxonomyEntries.map((entry) => entry.name);
export const taxonomyNameSet = new Set(taxonomyNames);
export const taxonomyGroups = taxonomyDocument.categories
  .map((group) => ({
    category: group.category,
    skills: taxonomyEntries
      .filter((entry) => entry.category === group.category)
      .map((entry) => entry.name),
  }))
  .filter((group) => group.skills.length);

const byKey = new Map(
  taxonomyEntries.map((entry) => [taxonomyKey(entry.name), entry]),
);
const aliases: Record<string, string> = {
  msdynamics: 'Microsoft Dynamics 365 CRM',
  msdynamicscrm: 'Microsoft Dynamics 365 CRM',
  mscrm: 'Microsoft Dynamics 365 CRM',
  dynamicscrm: 'Microsoft Dynamics 365 CRM',
  powerbi: 'Power BI',
  nodejs: 'Node.js',
  react: 'React.js',
  reactjs: 'React.js',
  nextjs: 'Next.js',
  vuejs: 'Vue.js',
};

function levenshtein(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, i) => i);
  for (let i = 1; i <= left.length; i++) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= right.length; j++) {
      const above = previous[j];
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[right.length];
}

export function exactTaxonomyMatch(value: string): TaxonomyMatch | null {
  const key = taxonomyKey(value);
  const direct = byKey.get(key);
  if (direct) return { ...direct, matchType: 'exact' };
  const aliasName = aliases[key];
  const alias = aliasName ? firstByName.get(aliasName) : null;
  return alias ? { ...alias, matchType: 'alias' } : null;
}

export function fuzzyTaxonomyMatch(
  value: string,
  threshold = 0.88,
): TaxonomyMatch | null {
  const key = taxonomyKey(value);
  if (key.length < 4) return null;
  let best: { entry: TaxonomyEntry; score: number } | null = null;
  for (const entry of taxonomyEntries) {
    const candidate = taxonomyKey(entry.name);
    const score =
      1 - levenshtein(key, candidate) / Math.max(key.length, candidate.length);
    if (!best || score > best.score) best = { entry, score };
  }
  return best && best.score >= threshold
    ? { ...best.entry, matchType: 'fuzzy' }
    : null;
}

export function resolveTaxonomyTerm(value: string) {
  return exactTaxonomyMatch(value) || fuzzyTaxonomyMatch(value);
}

export function isTaxonomyName(value: string) {
  return taxonomyNameSet.has(value);
}
