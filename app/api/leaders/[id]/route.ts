import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { leaderInput } from '@/lib/validation';
import { normalizeExperience } from '@/lib/normalization';
import { currentIdentity, requireAdmin } from '@/lib/authz';
export async function GET(
  _: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  const user = await currentIdentity();
  if (!user)
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const x = await db.leader.findFirst({
    where: {
      id: params.id,
      ...(user.role === 'ADMIN' || user.leaderId === params.id
        ? {}
        : { profileStatus: 'PUBLISHED' }),
    },
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
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  const user = await currentIdentity();
  if (!user)
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  if (user.role !== 'ADMIN' && user.leaderId !== params.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
      actorEmail: user.email || 'system',
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
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await db.leader.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
