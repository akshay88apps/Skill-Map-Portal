export type ExperienceDuration = { years: number; months: number };

const durationPattern = /^(\d{1,2}) years? (\d{1,2}) months?$/i;

export function parseExperienceDuration(
  value?: string | null,
): ExperienceDuration | null {
  const match = value?.trim().match(durationPattern);
  if (!match) return null;
  const years = Number(match[1]);
  const months = Number(match[2]);
  if (years < 0 || years > 40 || months < 0 || months > 12) return null;
  return { years, months };
}

export function formatExperienceDuration(years: number, months: number) {
  return `${years} ${years === 1 ? 'year' : 'years'} ${months} ${months === 1 ? 'month' : 'months'}`;
}

export function canonicalExperienceDuration(value?: string | null) {
  const parsed = parseExperienceDuration(value);
  if (parsed) return formatExperienceDuration(parsed.years, parsed.months);

  // Preserve old profiles that stored a single year count such as "16" or
  // "10+" by mapping them to the new explicit representation.
  const legacyYears = value?.trim().match(/^(\d{1,2})(?:\+)?(?:\s*years?)?$/i);
  if (!legacyYears) return '';
  const years = Number(legacyYears[1]);
  return years <= 40 ? formatExperienceDuration(years, 0) : '';
}

export function isExperienceDuration(value?: string | null) {
  return parseExperienceDuration(value) !== null;
}
