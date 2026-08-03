import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { canonical } from '@/lib/normalization';
import { selfRatingInput } from '@/lib/validation';
import { requireIdentity } from '@/lib/authz';
export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireIdentity();
  } catch {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }
  const parsed = selfRatingInput.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json(
      {
        error: 'A valid 1–5 rating for every skill is required',
        issues: parsed.error.flatten(),
      },
      { status: 422 },
    );
  const leader = user.leaderId
    ? await db.leader.findUnique({ where: { id: user.leaderId } })
    : null;
  if (!leader)
    return NextResponse.json(
      { error: 'No leader profile exists for this email' },
      { status: 404 },
    );
  await db.$transaction(async (tx) => {
    for (const { name, proficiency } of parsed.data.skills) {
      const canonicalName = canonical(name);
      const skill = await tx.skill.upsert({
        where: { name: canonicalName },
        update: {},
        create: { name: canonicalName },
      });
      await tx.leaderSkill.upsert({
        where: {
          leaderId_skillId_source: {
            leaderId: leader.id,
            skillId: skill.id,
            source: 'SELF_REPORTED',
          },
        },
        update: { proficiency, ratingSource: 'self_rated', confidence: null },
        create: {
          leaderId: leader.id,
          skillId: skill.id,
          source: 'SELF_REPORTED',
          proficiency,
          ratingSource: 'self_rated',
        },
      });
    }
  });
  return NextResponse.json({
    updated: parsed.data.skills.length,
    ratingSource: 'self_rated',
  });
}
