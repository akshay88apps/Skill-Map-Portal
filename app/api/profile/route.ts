import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireIdentity } from '@/lib/authz';
import { profileDraftInput, profileInput } from '@/lib/validation';
import {
  canonical,
  normalizeExperience,
  splitTerms,
  validCert,
} from '@/lib/normalization';

async function identity() {
  try {
    return await requireIdentity();
  } catch {
    return null;
  }
}
export async function GET() {
  const user = await identity();
  if (!user?.leaderId)
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  return NextResponse.json(
    await db.leader.findUnique({
      where: { id: user.leaderId },
      include: {
        skills: { include: { skill: true } },
        tools: { include: { tool: true } },
        projects: true,
        certifications: true,
      },
    }),
  );
}
export async function PATCH(req: NextRequest) {
  const user = await identity();
  if (!user?.leaderId)
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const parsed = profileDraftInput.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid draft' }, { status: 422 });
  const body = parsed.data;
  await db.leader.update({
    where: { id: user.leaderId },
    data: {
      draftData: body,
      profileStatus: 'DRAFT',
      lastProfileUpdate: new Date(),
    },
  });
  return NextResponse.json({ saved: true });
}
export async function POST(req: NextRequest) {
  const user = await identity();
  if (!user?.leaderId)
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const leaderId = user.leaderId;
  const parsed = profileInput.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Profile validation failed', issues: parsed.error.flatten() },
      { status: 422 },
    );
  const d = parsed.data;
  await db.$transaction(async (tx) => {
    const before = await tx.leader.findUniqueOrThrow({
      where: { id: leaderId },
    });
    await tx.leader.update({
      where: { id: leaderId },
      data: {
        fullName: d.fullName,
        preferredName: d.preferredName,
        department: d.department,
        jobTitle: d.jobTitle,
        experienceRaw: d.experience,
        experienceYearsEstimate: normalizeExperience(d.experience),
        leadershipBracketRaw: d.leadership,
        leadershipYearsEstimate: normalizeExperience(d.leadership),
        careerJourneyRaw: d.journey,
        draftData: d,
        profileStatus: 'SUBMITTED',
        submittedAt: new Date(),
        lastProfileUpdate: new Date(),
      },
    });
    await tx.project.deleteMany({ where: { leaderId } });
    if (d.projects?.trim())
      await tx.project.create({
        data: {
          leaderId,
          name: 'Submitted project history',
          rawText: d.projects,
          status: 'UNKNOWN',
        },
      });
    await tx.certification.deleteMany({ where: { leaderId } });
    for (const raw of splitTerms(d.certs).filter(validCert))
      await tx.certification.create({
        data: { leaderId, name: canonical(raw), rawText: raw },
      });
    await tx.leaderTool.deleteMany({ where: { leaderId } });
    for (const name of splitTerms(d.tools).map(canonical)) {
      const tool = await tx.tool.upsert({
        where: { name },
        update: {},
        create: { name },
      });
      await tx.leaderTool.create({
        data: { leaderId, toolId: tool.id },
      });
    }
    for (const { name, proficiency } of d.ratedSkills) {
      const skill = await tx.skill.upsert({
        where: { name: canonical(name) },
        update: {},
        create: { name: canonical(name) },
      });
      await tx.leaderSkill.upsert({
        where: {
          leaderId_skillId_source: {
            leaderId,
            skillId: skill.id,
            source: 'SELF_REPORTED',
          },
        },
        update: { proficiency, ratingSource: 'self_rated', confidence: null },
        create: {
          leaderId,
          skillId: skill.id,
          source: 'SELF_REPORTED',
          proficiency,
          ratingSource: 'self_rated',
        },
      });
    }
    await tx.auditLog.create({
      data: {
        leaderId,
        actorEmail: user.email || 'unknown',
        action: 'SUBMIT',
        entityType: 'Leader',
        entityId: leaderId,
        before: before as any,
        after: d as any,
      },
    });
  });
  return NextResponse.json({ submitted: true });
}
