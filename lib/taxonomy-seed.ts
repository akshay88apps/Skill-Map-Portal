import { db } from '@/lib/db';
import { taxonomyEntries } from '@/lib/taxonomy';

type TaxonomySeedDatabase = {
  skill: {
    upsert(args: {
      where: { name: string };
      update: { category: string; needsReview: false };
      create: { name: string; category: string; needsReview: false };
    }): Promise<unknown>;
  };
};

export async function seedTaxonomy(
  database: TaxonomySeedDatabase = db,
) {
  for (const entry of taxonomyEntries)
    await database.skill.upsert({
      where: { name: entry.name },
      update: { category: entry.category, needsReview: false },
      create: {
        name: entry.name,
        category: entry.category,
        needsReview: false,
      },
    });
  return taxonomyEntries.length;
}
