import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { leaderInput } from '@/lib/validation';
import { normalizeExperience } from '@/lib/normalization';
export async function GET(
  _: NextRequest,
  { params }: { params: { id: string } },
) {
  const x = await db.leader.findUnique({
    where: { id: params.id },
    include: {
      skills: { include: { skill: true } },
      tools: { include: { tool: true } },
      projects: true,
      certifications: true,
      snapshots: true,
    },
  });
  return x
    ? NextResponse.json(x)
    : NextResponse.json({ error: 'Not found' }, { status: 404 });
}
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const parsed = leaderInput.partial().safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.flatten() },
      { status: 422 },
    );
  const current = await db.leader.findUnique({ where: { id: params.id } });
  if (!current)
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (
    parsed.data.updatedAt &&
    current.updatedAt.toISOString() !== parsed.data.updatedAt
  )
    return NextResponse.json(
      { error: 'Profile changed since it was opened', current },
      { status: 409 },
    );
  const { _updatedAt, ...data } = {
    ...parsed.data,
    _updatedAt: parsed.data.updatedAt,
  };
  delete (data as { updatedAt?: string }).updatedAt;
  const after = await db.leader.update({
    where: { id: params.id },
    data: {
      ...data,
      ...(data.experienceRaw !== undefined
        ? { experienceYearsEstimate: normalizeExperience(data.experienceRaw) }
        : {}),
    },
  });
  await db.auditLog.create({
    data: {
      leaderId: params.id,
      actorEmail: req.headers.get('x-user-email') || 'system',
      action: 'UPDATE',
      entityType: 'Leader',
      entityId: params.id,
      before: current as any,
      after: after as any,
    },
  });
  return NextResponse.json(after);
}
export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string } },
) {
  await db.leader.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
