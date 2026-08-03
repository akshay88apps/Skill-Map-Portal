import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projectInput } from '@/lib/validation';
import { currentIdentity } from '@/lib/authz';
export async function GET(req: NextRequest) {
  const user = await currentIdentity();
  if (!user)
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const requested = req.nextUrl.searchParams.get('leaderId');
  if (user.role !== 'ADMIN' && requested !== user.leaderId)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json(
    await db.project.findMany({
      where: req.nextUrl.searchParams.get('leaderId')
        ? { leaderId: req.nextUrl.searchParams.get('leaderId')! }
        : {},
    }),
  );
}
export async function POST(req: NextRequest) {
  const user = await currentIdentity();
  if (!user)
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const p = projectInput.safeParse(await req.json());
  if (p.success && user.role !== 'ADMIN' && p.data.leaderId !== user.leaderId)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return p.success
    ? NextResponse.json(await db.project.create({ data: p.data }), {
        status: 201,
      })
    : NextResponse.json(
        { error: 'Validation failed', issues: p.error.flatten() },
        { status: 422 },
      );
}
