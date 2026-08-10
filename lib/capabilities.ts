import capabilityConfig from '@/data/capability-mapping.json';

export type CapabilityMappingConfig = {
  capabilityOrder?: readonly string[];
  categoryToCapability: Readonly<Record<string, string>>;
  categoryDisplayLabels?: Readonly<Record<string, string>>;
  capabilityAssignmentLabels?: Readonly<Record<string, string>>;
  manualCapabilities: ReadonlyArray<{ value: string; label: string }>;
};

export const capabilityMappingConfig: CapabilityMappingConfig = capabilityConfig;
export const categoryCapabilityMap = capabilityMappingConfig.categoryToCapability;
export type SkillDerivedCapability =
  (typeof categoryCapabilityMap)[keyof typeof categoryCapabilityMap];

export const manualCapabilityOptions = capabilityMappingConfig.manualCapabilities;
export type ManualCapabilityTag =
  (typeof manualCapabilityOptions)[number]['value'];

function orderedCapabilities(
  names: readonly string[],
  preferredOrder: readonly string[] = [],
) {
  const available = new Set(names);
  return [
    ...preferredOrder.filter((name) => available.has(name)),
    ...names.filter((name) => !preferredOrder.includes(name)),
  ];
}

const mappedCapabilityNames = [...new Set(Object.values(categoryCapabilityMap))];
export const skillDerivedCapabilities = orderedCapabilities(
  mappedCapabilityNames,
  capabilityMappingConfig.capabilityOrder,
);
export const capabilityNames = orderedCapabilities(
  [
    ...mappedCapabilityNames,
    ...manualCapabilityOptions.map((option) => option.label),
  ],
  capabilityMappingConfig.capabilityOrder,
);

export type CapabilityReferenceRow = {
  name: string;
  categories: string[];
  assignment: string;
  kind: 'skill-derived' | 'manual';
};

export function buildCapabilityReferenceRows(
  config: CapabilityMappingConfig = capabilityMappingConfig,
): CapabilityReferenceRow[] {
  const mappedNames = [...new Set(Object.values(config.categoryToCapability))];
  const manualNames = config.manualCapabilities.map((option) => option.label);
  const names = orderedCapabilities(
    [...mappedNames, ...manualNames],
    config.capabilityOrder,
  );

  return names.map((name) => {
    const categories = Object.entries(config.categoryToCapability)
      .filter(([, capability]) => capability === name)
      .map(
        ([category]) => config.categoryDisplayLabels?.[category] || category,
      );
    const kind = categories.length ? 'skill-derived' : 'manual';
    return {
      name,
      categories,
      kind,
      assignment:
        config.capabilityAssignmentLabels?.[name] ||
        (kind === 'skill-derived'
          ? 'From your selected skills'
          : 'Tagged by HR/Admin'),
    };
  });
}

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
