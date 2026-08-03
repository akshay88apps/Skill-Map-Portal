import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/authz';
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const leaders = await db.leader.findMany({
    include: {
      skills: { include: { skill: true } },
      projects: true,
      certifications: true,
    },
    orderBy: { fullName: 'asc' },
  });
  return NextResponse.json(leaders);
}
