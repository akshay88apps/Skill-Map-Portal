import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/authz';
export async function GET(_req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json(
    await db.reviewItem.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    }),
  );
}
