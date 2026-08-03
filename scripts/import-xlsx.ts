import * as XLSX from 'xlsx';
import { db } from '../lib/db';
import {
  canonical,
  normalizeExperience,
  splitTerms,
  validCert,
} from '../lib/normalization';
import {
  extractWithAI,
  partitionByConfidence,
  safeInferredProficiency,
} from '../lib/ingestion/service';
const file = process.argv[2] || 'Tech_Leaders_Skill_Gathering.xlsx';
const wb = XLSX.readFile(file);
const rows = XLSX.utils.sheet_to_json<Record<string, string>>(
  wb.Sheets[wb.SheetNames[0]],
  { defval: '' },
);
const pick = (r: Record<string, string>, ...names: string[]) =>
  names.map((n) => r[n]).find(Boolean) || '';
async function run() {
  for (const row of rows) {
    const fullName = pick(row, 'Full Name', 'Full name');
    const preferredName = pick(row, 'Name');
    const email = pick(row, 'Email', 'E-mail').trim().toLowerCase();
    if (!fullName || !email) {
      console.warn('Skipping row without name/email');
      continue;
    }
    const experienceRaw = pick(row, 'Your total relevant experience is?');
    const leadershipBracketRaw = pick(
      row,
      'Years of Experience in Technology Leadership',
    );
    const leader = await db.leader.upsert({
      where: { email },
      update: {
        fullName,
        preferredName,
        experienceRaw,
        experienceYearsEstimate: normalizeExperience(experienceRaw),
        leadershipBracketRaw,
        leadershipYearsEstimate: normalizeExperience(leadershipBracketRaw),
      },
      create: {
        fullName,
        preferredName,
        email,
        experienceRaw,
        experienceYearsEstimate: normalizeExperience(experienceRaw),
        leadershipBracketRaw,
        leadershipYearsEstimate: normalizeExperience(leadershipBracketRaw),
      },
    });
    for (const name of splitTerms(pick(row, 'Any Certification')).filter(
      validCert,
    ))
      await db.certification.create({
        data: { leaderId: leader.id, name: canonical(name), rawText: name },
      });
    const extracted = await extractWithAI({
      projects: pick(row, 'Past Projects, duration & your role in project'),
      primary: pick(row, 'Primary Skill'),
      secondary: pick(row, 'Secondary Skill'),
      proficient: pick(
        row,
        'Which technical skills are you most proficient in?',
      ),
      tools: pick(row, 'Tools you know'),
    });
    const { accepted, needsReview } = partitionByConfidence(extracted);
    for (const x of accepted.filter((x) => x.type === 'skill')) {
      const name = String(x.payload.canonicalName);
      const proficiency = safeInferredProficiency(x.payload);
      const skill = await db.skill.upsert({
        where: { name },
        update: {},
        create: { name },
      });
      await db.leaderSkill.upsert({
        where: {
          leaderId_skillId_source: {
            leaderId: leader.id,
            skillId: skill.id,
            source: 'AI_EXTRACTED',
          },
        },
        update: {
          proficiency,
          ratingSource: 'inferred',
          confidence: x.confidence,
        },
        create: {
          leaderId: leader.id,
          skillId: skill.id,
          source: 'AI_EXTRACTED',
          proficiency,
          ratingSource: 'inferred',
          confidence: x.confidence,
        },
      });
    }
    for (const x of needsReview)
      await db.reviewItem.create({
        data: {
          entityType: x.type,
          payload: { ...x.payload, leaderId: leader.id },
          confidence: x.confidence,
        },
      });
  }
  console.log(`Imported ${rows.length} rows.`);
}
run().finally(() => db.$disconnect());
