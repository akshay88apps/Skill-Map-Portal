import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { leaderInput } from '@/lib/validation';
import { normalizeExperience } from '@/lib/normalization';
import { currentIdentity, requireAdmin } from '@/lib/authz';
export async function GET(req: NextRequest) {
  const user = await currentIdentity();
  if (!user)
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const s = req.nextUrl.searchParams;
  const page = Math.max(1, Number(s.get('page') || 1));
  const size = Math.min(100, Math.max(1, Number(s.get('size') || 20)));
  const where: any =
    user.role === 'ADMIN' ? {} : { profileStatus: 'PUBLISHED' };
  if (s.get('department')) where.department = s.get('department');
  if (s.get('skill'))
    where.skills = {
      some: {
        skill: { name: { contains: s.get('skill')!, mode: 'insensitive' } },
      },
    };
  if (s.get('q'))
    where.OR = ['fullName', 'preferredName', 'jobTitle'].map((k) => ({
      [k]: { contains: s.get('q')!, mode: 'insensitive' },
    }));
  const orderBy: any = {
    [s.get('sort') || 'fullName']: s.get('order') === 'desc' ? 'desc' : 'asc',
  };
  const [items, total] = await Promise.all([
    db.leader.findMany({
      where,
      include: {
        skills: { include: { skill: true } },
        projects: true,
        certifications: true,
      },
      skip: (page - 1) * size,
      take: size,
      orderBy,
    }),
    db.leader.count({ where }),
  ]);
  return NextResponse.json({
    items,
    total,
    page,
    size,
    pages: Math.ceil(total / size),
  });
}
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const parsed = leaderInput.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.flatten() },
      { status: 422 },
    );
  const d = parsed.data;
  const item = await db.leader.create({
    data: {
      ...d,
      experienceYearsEstimate: normalizeExperience(d.experienceRaw),
      leadershipYearsEstimate: normalizeExperience(d.leadershipBracketRaw),
    },
  });
  return NextResponse.json(item, { status: 201 });
}
