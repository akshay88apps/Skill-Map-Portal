import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/authz';
import { reviewInput } from '@/lib/validation';
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
  const p = reviewInput.safeParse(await req.json());
  if (!p.success)
    return NextResponse.json({ error: 'Invalid action' }, { status: 422 });
  const item = await db.reviewItem.findUnique({ where: { id: params.id } });
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const payload = p.data.payload || (item.payload as Record<string, unknown>);
  if (p.data.action === 'approve') {
    const leaderId = String(payload.leaderId || '');
    if (!leaderId)
      return NextResponse.json(
        { error: 'Review payload has no leader' },
        { status: 422 },
      );
    if (item.entityType === 'skill') {
      const name = String(payload.canonicalName || payload.name || '');
      const proficiency = Math.min(
        5,
        Math.max(1, Number(payload.proficiency) || 3),
      );
      const skill = await db.skill.upsert({
        where: { name },
        update: {},
        create: { name },
      });
      await db.leaderSkill.upsert({
        where: {
          leaderId_skillId_source: {
            leaderId,
            skillId: skill.id,
            source: 'AI_EXTRACTED',
          },
        },
        update: {
          proficiency,
          ratingSource: 'inferred',
          confidence: item.confidence,
        },
        create: {
          leaderId,
          skillId: skill.id,
          source: 'AI_EXTRACTED',
          proficiency,
          ratingSource: 'inferred',
          confidence: item.confidence,
        },
      });
    } else if (item.entityType === 'project') {
      await db.project.create({
        data: {
          leaderId,
          name: String(payload.name || 'Reviewed project'),
          client: payload.client ? String(payload.client) : null,
          role: payload.role ? String(payload.role) : null,
          durationText: payload.durationText
            ? String(payload.durationText)
            : null,
          durationMonthsEstimate: payload.durationMonthsEstimate
            ? Number(payload.durationMonthsEstimate)
            : null,
          status: ['ACTIVE', 'CLOSED'].includes(String(payload.status))
            ? (String(payload.status) as 'ACTIVE' | 'CLOSED')
            : 'UNKNOWN',
          rawText: payload.rawText ? String(payload.rawText) : null,
          confidence: item.confidence,
        },
      });
    }
  }
  return NextResponse.json(
    await db.reviewItem.update({
      where: { id: params.id },
      data: {
        status: p.data.action === 'approve' ? 'APPROVED' : 'REJECTED',
        payload: payload as any,
        reviewedBy: admin.email || 'admin',
        reviewedAt: new Date(),
      },
    }),
  );
}
