import capabilityConfig from '@/data/capability-mapping.json';

export const categoryCapabilityMap = capabilityConfig.categoryToCapability;
export type SkillDerivedCapability =
  (typeof categoryCapabilityMap)[keyof typeof categoryCapabilityMap];

export const manualCapabilityOptions = capabilityConfig.manualCapabilities;
export type ManualCapabilityTag =
  (typeof manualCapabilityOptions)[number]['value'];

export const skillDerivedCapabilities = [
  ...new Set(Object.values(categoryCapabilityMap)),
];
export const capabilityNames = [
  ...skillDerivedCapabilities,
  ...manualCapabilityOptions.map((option) => option.label),
];

const manualLabels = new Map(
  manualCapabilityOptions.map((option) => [option.value, option.label]),
);

export function capabilityForCategory(category: string | null | undefined) {
  return category
    ? categoryCapabilityMap[category as keyof typeof categoryCapabilityMap] ||
        null
    : null;
}

export function manualCapabilityLabel(tag: string) {
  return manualLabels.get(tag as ManualCapabilityTag) || null;
}

export function categoriesForCapability(capability: string) {
  return Object.entries(categoryCapabilityMap)
    .filter(([, mapped]) => mapped === capability)
    .map(([category]) => category);
}

export function manualTagForCapability(capability: string) {
  return (
    manualCapabilityOptions.find((option) => option.label === capability)
      ?.value || null
  );
}

export type CapabilityLeader = {
  id: string;
  skills: Array<{ skill: { category?: string | null } }>;
  additionalCapabilityTags?: string[];
};

export function capabilitiesForLeader(leader: CapabilityLeader) {
  const names = new Set<string>();
  for (const rating of leader.skills) {
    const capability = capabilityForCategory(rating.skill.category);
    if (capability) names.add(capability);
  }
  for (const tag of leader.additionalCapabilityTags || []) {
    const label = manualCapabilityLabel(tag);
    if (label) names.add(label);
  }
  return [...names];
}

export function buildCapabilityMatrix(leaders: CapabilityLeader[]) {
  return capabilityNames.map((name) => {
    const manual = manualCapabilityOptions.some((option) => option.label === name);
    const leaderIds = leaders
      .filter((leader) => capabilitiesForLeader(leader).includes(name))
      .map((leader) => leader.id);
    return {
      name,
      kind: manual ? ('manual' as const) : ('skill-derived' as const),
      leaderIds,
      headcount: leaderIds.length,
    };
  });
}
