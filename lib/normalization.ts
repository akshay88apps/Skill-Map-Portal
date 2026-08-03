export function normalizeExperience(value?: string | null) {
  if (!value?.trim()) return null;
  const nums = value.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (!nums.length) return null;
  if (nums.length > 1) return (nums[0] + nums[1]) / 2;
  return nums[0];
}
export function splitTerms(value?: string | null) {
  if (!value) return [];
  return [
    ...new Set(
      value
        .split(/[,;|\n]+/)
        .map((v) => v.trim())
        .filter(Boolean),
    ),
  ];
}
export function validCert(value: string) {
  const junk = /^(n\/?a|none|no|yes|nil|na)$/i;
  return value.length > 1 && !junk.test(value.trim());
}
export function canonical(value: string) {
  const v = value
    .trim()
    .toLowerCase()
    .replace(/[._-]/g, ' ')
    .replace(/\s+/g, ' ');
  const aliases: Record<string, string> = {
    'ms dynamics': 'Microsoft Dynamics 365',
    'ms dynamics crm': 'Microsoft Dynamics 365',
    'ms crm': 'Microsoft Dynamics 365',
    powerbi: 'Power BI',
    'power bi': 'Power BI',
    'node js': 'Node.js',
    'react js': 'React',
  };
  return aliases[v] ?? v.replace(/\b\w/g, (c) => c.toUpperCase());
}
