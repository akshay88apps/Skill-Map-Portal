import { db } from '../lib/db';
import { demoLeaders } from '../lib/demo';
import { seedTaxonomy } from '../lib/taxonomy-seed';
import { resolveTaxonomyTerm } from '../lib/taxonomy';
async function seed() {
  await seedTaxonomy(db);
  for (const d of demoLeaders) {
    const leader = await db.leader.upsert({
      where: { email: d.email },
      update: {},
      create: {
        fullName: d.fullName,
        preferredName: d.preferredName,
        email: d.email,
        department: d.department,
        jobTitle: d.jobTitle,
        experienceYearsEstimate: d.experienceYearsEstimate,
        leadershipBracketRaw: d.leadershipBracketRaw,
        profileCompleted: true,
        lastProfileUpdate: new Date(d.updatedAt),
      },
    });
    for (const [name, proficiency] of d.skills) {
      const taxonomyMatch = resolveTaxonomyTerm(name);
      if (!taxonomyMatch) continue;
      const skill = await db.skill.findUniqueOrThrow({
        where: { name: taxonomyMatch.name },
      });
      await db.leaderSkill.upsert({
        where: {
          leaderId_skillId_source: {
            leaderId: leader.id,
            skillId: skill.id,
            source: 'SELF_REPORTED',
          },
        },
        update: { proficiency, ratingSource: 'demo' },
        create: {
          leaderId: leader.id,
          skillId: skill.id,
          source: 'SELF_REPORTED',
          proficiency,
          ratingSource: 'demo',
        },
      });
    }
  }
}
seed().finally(() => db.$disconnect());
