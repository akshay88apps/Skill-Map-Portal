import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/authz';
const input = z.object({
  role: z.enum(['ADMIN', 'LEADER', 'VIEWER']).optional(),
  profileStatus: z
    .enum([
      'INVITED',
      'DRAFT',
      'SUBMITTED',
      'PUBLISHED',
      'RETURNED',
      'DEACTIVATED',
    ])
    .optional(),
});
export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const parsed = input.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Invalid role or status' },
      { status: 422 },
    );
  const before = await db.leader.findUnique({ where: { id: params.id } });
  if (!before)
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const after = await db.leader.update({
    where: { id: params.id },
    data: {
      ...parsed.data,
      ...(parsed.data.profileStatus === 'PUBLISHED'
        ? { publishedAt: new Date() }
        : {}),
    },
  });
  await db.auditLog.create({
    data: {
      leaderId: params.id,
      actorEmail: admin.email || 'admin',
      action: 'ADMIN_UPDATE',
      entityType: 'Leader',
      entityId: params.id,
      before: before as any,
      after: after as any,
    },
  });
  return NextResponse.json(after);
}
