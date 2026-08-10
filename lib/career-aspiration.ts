export const careerTimeframeOptions = [
  { value: 'ZERO_TO_SIX_MONTHS', label: '0-6 months' },
  { value: 'SIX_TO_TWELVE_MONTHS', label: '6-12 months' },
  { value: 'ONE_TO_TWO_YEARS', label: '1-2 years' },
  { value: 'TWO_PLUS_YEARS', label: '2+ years' },
] as const;

export type CareerTimeframe =
  (typeof careerTimeframeOptions)[number]['value'];

const careerTimeframeValues = new Set<string>(
  careerTimeframeOptions.map((option) => option.value),
);

export function isCareerTimeframe(value: unknown): value is CareerTimeframe {
  return typeof value === 'string' && careerTimeframeValues.has(value);
}

export function careerTimeframeLabel(value: string | null | undefined) {
  return (
    careerTimeframeOptions.find((option) => option.value === value)?.label ||
    null
  );
}

const proficiencyLabels = [
  '',
  'Novice',
  'Familiar',
  'Proficient',
  'Advanced',
  'Expert',
];

export function proficiencyLabel(value: number | null | undefined) {
  return value && proficiencyLabels[value]
    ? `${proficiencyLabels[value]} (${value})`
    : 'Not yet rated';
}

export function proficiencyComparison(
  current: number | null | undefined,
  target: number,
) {
  return `${proficiencyLabel(current)} → targeting ${proficiencyLabel(target)}`;
}
