import {
  exactTaxonomyMatch,
  fuzzyTaxonomyMatch,
  type TaxonomyMatch,
} from '@/lib/taxonomy';

type AliasDatabase = {
  skillAlias: {
    findFirst(args: {
      where: { rawText: { equals: string; mode: 'insensitive' } };
      select: { skill: { select: { name: true; category: true } } };
    }): Promise<{ skill: { name: string; category: string | null } } | null>;
  };
};

export type CanonicalSkillResolution = TaxonomyMatch | {
  name: string;
  category: string | null;
  matchType: 'database-alias';
};

export async function resolveCanonicalSkill(
  rawText: string,
  database: AliasDatabase,
): Promise<CanonicalSkillResolution | null> {
  const exact = exactTaxonomyMatch(rawText);
  if (exact) return exact;

  const alias = await database.skillAlias.findFirst({
    where: { rawText: { equals: rawText.trim(), mode: 'insensitive' } },
    select: { skill: { select: { name: true, category: true } } },
  });
  if (alias)
    return {
      name: alias.skill.name,
      category: alias.skill.category,
      matchType: 'database-alias',
    };

  return fuzzyTaxonomyMatch(rawText);
}
